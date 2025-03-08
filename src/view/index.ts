import { randomBytes } from "crypto";
import { ActionRowBuilder, AnyComponentBuilder, ButtonBuilder, ChannelSelectMenuBuilder, ChannelSelectMenuComponentData, ComponentData, ComponentType, InteractionButtonComponentData, MentionableSelectMenuBuilder, MentionableSelectMenuComponentData, Message, MessageComponentInteraction, MessageCreateOptions, MessageEditOptions, RoleSelectMenuBuilder, RoleSelectMenuComponentData, Snowflake, StringSelectMenuBuilder, StringSelectMenuComponentData, TextChannel, UserSelectMenuBuilder, UserSelectMenuComponentData } from "discord.js";
import { ComponentHandler, ComponentHandlerMetadata, ComponentHandlerParameter, Constructor, NonLinkButtonMessageActionRowComponentData, NonTextInputComponentBuilder } from "src/interfaces";
import Logger from "src/logger";

const ComponentHandlers = Symbol("ComponentHandlers");

export default class View {
    static index = new Map<Snowflake, View>();

    private actionRows: ActionRowBuilder<NonTextInputComponentBuilder>[] = [];
    private components: ComponentHandler<NonLinkButtonMessageActionRowComponentData>[] = [];

    constructor(public message?: Message) {
        const componentsMetadata = this.constructor.prototype[ComponentHandlers] as ComponentHandlerMetadata<NonLinkButtonMessageActionRowComponentData>[];
        for (const metadata of componentsMetadata ?? []) {
            this.setComponent({
                ...metadata,
                callback: async (...args: any) => await (this as any)[metadata.method](...args)
            });
        }

        if (this.message) {
            this.message.edit({ components: this.actionRows });
            View.index.set(this.message.id, this);
        }
    }

    setComponent(component: ComponentHandler<NonLinkButtonMessageActionRowComponentData>, canReplace: boolean = true) {
        this.components.push(component);

        let row = component.row ?? this.actionRows.findIndex((e) => e.components.length < 5);
        if (row === -1) row = this.actionRows.length;
        this.actionRows[row] ??= new ActionRowBuilder();
        
        let index = component.index ?? this.actionRows[row].components.findIndex((e) => typeof e === "undefined");
        if (index === -1) index = this.actionRows[row].components.length;
        if (this.actionRows[row].components[index] && !canReplace) {
            throw RangeError(`Component is trying to fill an occupied slot`);
        }
        this.actionRows[row].components[index] = new component.builder(component);
    }

    async send(channel: TextChannel, options: string | MessageCreateOptions) {
        if (this.message) {
            throw Error("View was already sent. Did you mean to use edit?");
        }

        this.message = await channel.send({ ...(typeof options === "string" ? { content: options } : options), components: this.actionRows });
        if (this.message) {
            View.index.set(this.message.id, this);
        }
        return this;
    }

    async edit(options: string | MessageEditOptions) {
        await this.message?.edit({ ...(typeof options === "string" ? { content: options } : options), components: this.actionRows });
        return this;
    }

    async handle(interaction: MessageComponentInteraction) {
        for (const component of this.components) {
            if (component.customId === interaction.customId) {
                Logger.log(`Running component handler for "${component.method.toString()}" of ${this.constructor.name}`);
                await component.callback(interaction);
            }
        }
    }

    async delete() {
        if (this.message) {
            await this.message.delete();
            if (View.index.get(this.message.id) === this) View.index.delete(this.message.id);
        }
    }

    async end() {
        if (this.message && View.index.get(this.message.id) === this) {
            View.index.delete(this.message.id);
            await this.message.edit({ ...this.message, attachments: [...this.message.attachments.values()], flags: undefined, components: undefined });
            delete this.message;
        }
    }
}

function ComponentHandlerDecorator(metadata: ComponentData & { builder: Constructor<AnyComponentBuilder> }): MethodDecorator {
    return function (target: any, propertyKey: symbol | string, descriptor: PropertyDescriptor) {
        target[ComponentHandlers] ??= [] as ComponentHandlerMetadata<NonLinkButtonMessageActionRowComponentData>[];
        target[ComponentHandlers].push({ ...metadata, method: propertyKey });
    };
}

export function Button(metadata: ComponentHandlerParameter<InteractionButtonComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.Button, customId: randomBytes(20).toString('hex'), builder: ButtonBuilder });
}

export function StringSelect(metadata: ComponentHandlerParameter<StringSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.StringSelect, customId: randomBytes(20).toString('hex'), builder: StringSelectMenuBuilder });
}

export function UserSelect(metadata: ComponentHandlerParameter<UserSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.UserSelect, customId: randomBytes(20).toString('hex'), builder: UserSelectMenuBuilder });
}

export function ChannelSelect(metadata: ComponentHandlerParameter<ChannelSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.ChannelSelect, customId: randomBytes(20).toString('hex'), builder: ChannelSelectMenuBuilder });
}

export function RoleSelect(metadata: ComponentHandlerParameter<RoleSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.RoleSelect, customId: randomBytes(20).toString('hex'), builder: RoleSelectMenuBuilder });
}

export function MentionableSelect(metadata: ComponentHandlerParameter<MentionableSelectMenuComponentData>): MethodDecorator {
    return ComponentHandlerDecorator({ ...metadata, type: ComponentType.MentionableSelect, customId: randomBytes(20).toString('hex'), builder: MentionableSelectMenuBuilder });
}