import { client } from "client";
import { randomBytes } from "crypto";
import { ActionRowBuilder, AnyComponentBuilder, ButtonBuilder, ChannelSelectMenuBuilder, ChannelSelectMenuComponentData, ComponentData, ComponentType, InteractionButtonComponentData, InteractionReplyOptions, MentionableSelectMenuBuilder, MentionableSelectMenuComponentData, Message, MessageComponentInteraction, MessageCreateOptions, MessageEditOptions, RepliableInteraction, RoleSelectMenuBuilder, RoleSelectMenuComponentData, SendableChannels, Snowflake, StringSelectMenuBuilder, StringSelectMenuComponentData, UserSelectMenuBuilder, UserSelectMenuComponentData } from "discord.js";
import { ComponentHandler, ComponentHandlerMetadata, ComponentHandlerParameter, ComponentHandlerMetadataParameter, Constructor, NonLinkButtonMessageActionRowComponentData, NonTextInputComponentBuilder } from "interfaces";
import Logger from "logger";

const ComponentHandlers = Symbol("ComponentHandlers");

export default class View {
    static index = new Map<Snowflake, View>();

    protected actionRows: ActionRowBuilder<NonTextInputComponentBuilder>[] = [];
    private components: ComponentHandler[] = [];

    constructor(public message?: Message) {
        const componentsMetadata = this.constructor.prototype[ComponentHandlers] as ComponentHandlerMetadata[];
        for (const metadata of componentsMetadata ?? []) {
            this.setComponent({
                ...metadata,
                callback: async (...args: any) => await (this as any)[metadata.method](...args)
            });
        }

        if (this.message) {
            View.index.set(this.message.id, this);
        }
    }

    private setComponent<T extends NonLinkButtonMessageActionRowComponentData>(component: ComponentHandler<T>, canReplace: boolean = true) {
        let row = component.row ?? this.actionRows.findIndex((e) => !e || e.components.length < 5);
        if (row === -1) row = this.actionRows.length;
        this.actionRows[row] ??= new ActionRowBuilder();
        
        let index = component.index ?? this.actionRows[row].components.findIndex((e) => typeof e === "undefined");
        if (index === -1) index = this.actionRows[row].components.length;
        if (this.actionRows[row].components[index] && !canReplace) {
            throw RangeError(`Component is trying to fill an occupied slot`);
        }
        this.components.push(component);
        this.actionRows[row].components[index] = new component.builder(component);
    }

    public setButton(component: ComponentHandlerParameter<InteractionButtonComponentData>) {
        this.setComponent({
            ...component,
            customId: randomBytes(20).toString('hex'),
            builder: ButtonBuilder,
            type: ComponentType.Button
        });
    }

    public setStringSelect(component: ComponentHandlerParameter<StringSelectMenuComponentData>) {
        this.setComponent({
            ...component,
            customId: randomBytes(20).toString('hex'),
            builder: StringSelectMenuBuilder,
            type: ComponentType.StringSelect
        });
    }

    public setUserSelect(component: ComponentHandlerParameter<UserSelectMenuComponentData>) {
        this.setComponent({
            ...component,
            customId: randomBytes(20).toString('hex'),
            builder: UserSelectMenuBuilder,
            type: ComponentType.UserSelect
        });
    }

    public setChannelSelect(component: ComponentHandlerParameter<ChannelSelectMenuComponentData>) {
        this.setComponent({
            ...component,
            customId: randomBytes(20).toString('hex'),
            builder: ChannelSelectMenuBuilder,
            type: ComponentType.ChannelSelect
        });
    }

    public setRoleSelect(component: ComponentHandlerParameter<RoleSelectMenuComponentData>) {
        this.setComponent({
            ...component,
            customId: randomBytes(20).toString('hex'),
            builder: RoleSelectMenuBuilder,
            type: ComponentType.RoleSelect
        });
    }

    public setMentionableSelect(component: ComponentHandlerParameter<MentionableSelectMenuComponentData>) {
        this.setComponent({
            ...component,
            customId: randomBytes(20).toString('hex'),
            builder: MentionableSelectMenuBuilder,
            type: ComponentType.MentionableSelect
        });
    }

    public async send(channel: SendableChannels, options: string | MessageCreateOptions) {
        if (this.message) {
            throw Error("View was already sent. Did you mean to use edit?");
        }

        this.message = await channel.send({ ...(typeof options === "string" ? { content: options } : options), components: this.actionRows });
        if (this.message) {
            View.index.set(this.message.id, this);
        }
        return this;
    }

    public async reply(interaction: RepliableInteraction, options: InteractionReplyOptions) {
        if (this.message) {
            throw Error("View was already sent. Did you mean to use edit?");
        }

        const res = await interaction.reply({ ...options, components: this.actionRows, withResponse: true });
        this.message = res.resource?.message ?? undefined;
        if (this.message) {
            View.index.set(this.message.id, this);
        }
        return this;
    }

    public async resend(options: string | MessageCreateOptions, deletePrevious: boolean = true) {
        if (this.message) {
            View.index.delete(this.message.id);
            const channel = this.message.channel as SendableChannels;

            if (deletePrevious) {
                await this.message.delete();
            } else {
                await this.message.edit({
                    content: this.message.content,
                    embeds: this.message.embeds,
                    attachments: [...this.message.attachments.values()]
                });
            }

            this.message = undefined;
            await this.send(channel, options);
        }
        return this;
    }

    public async edit(options: string | MessageEditOptions) {
        await this.message?.edit({ ...(typeof options === "string" ? { content: options } : options), components: this.actionRows });
        return this;
    }

    protected filter(interaction: MessageComponentInteraction, handler: ComponentHandler) {
        return true;
    }

    public async handle(interaction: MessageComponentInteraction) {
        for (const component of this.components) {
            if (component.customId === interaction.customId) {
                if (!this.filter(interaction, component)) {
                    return interaction.deferUpdate();
                }
                Logger.log(`Running component handler for ${this.constructor.name}`);
                await component.callback(interaction);
            }
        }
    }

    public async delete() {
        if (this.message) {
            await this.message.delete();
            if (View.index.get(this.message.id) === this) View.index.delete(this.message.id);
        }
    }

    public async end() {
        if (this.message && View.index.get(this.message.id) === this) {
            View.index.delete(this.message.id);
            await this.message.edit({
                content: this.message.content,
                embeds: this.message.embeds,
                components: [],
                attachments: [...this.message.attachments.values()]
            });
            delete this.message;
        }
    }

    serialize() {
        return {
            channel: this.message?.channelId,
            message: this.message?.id
        }
    }

    static async load(obj: Record<string, any>) {
        try {
            const channel = await client.channels.fetch(obj.channel);
            return channel?.isSendable() ? await channel.messages.fetch(obj.message) : undefined;
        } catch {
            return undefined;
        }
    }
}

function ComponentHandlerDecorator(metadata: ComponentData & { builder: Constructor<AnyComponentBuilder> }): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        target[ComponentHandlers] ??= [] as ComponentHandlerMetadata[];
        target[ComponentHandlers].push({ ...metadata, method: propertyKey });
    };
}

export function Button(metadata: ComponentHandlerMetadataParameter<InteractionButtonComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.Button, customId: randomBytes(20).toString('hex'), builder: ButtonBuilder });
}

export function StringSelect(metadata: ComponentHandlerMetadataParameter<StringSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.StringSelect, customId: randomBytes(20).toString('hex'), builder: StringSelectMenuBuilder });
}

export function UserSelect(metadata: ComponentHandlerMetadataParameter<UserSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.UserSelect, customId: randomBytes(20).toString('hex'), builder: UserSelectMenuBuilder });
}

export function ChannelSelect(metadata: ComponentHandlerMetadataParameter<ChannelSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.ChannelSelect, customId: randomBytes(20).toString('hex'), builder: ChannelSelectMenuBuilder });
}

export function RoleSelect(metadata: ComponentHandlerMetadataParameter<RoleSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.RoleSelect, customId: randomBytes(20).toString('hex'), builder: RoleSelectMenuBuilder });
}

export function MentionableSelect(metadata: ComponentHandlerMetadataParameter<MentionableSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.MentionableSelect, customId: randomBytes(20).toString('hex'), builder: MentionableSelectMenuBuilder });
}