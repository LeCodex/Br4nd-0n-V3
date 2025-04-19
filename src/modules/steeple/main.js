const {MessageEmbed} = require('discord.js');
const {DateTime} = require('luxon');
const {Base} = require(module.parent.path + "/base/main.js");
const Game = require("./game.js");
const Player = require("./player.js");

class MainClass extends Base {
	constructor(client) {
		super(client);
		this.name = "Steeple Chaise";
		this.description = "Organise des courses de chaise";
		this.help = {
			"": "Inscris à la prochaine course",
			"rank": "Envoies le classement de la partie",
			"show": "Redescends le message d'info de la partie"
		};
		this.commandText = "steeple";
		this.color = 0xC1694F;
		this.pseudo_auth = [ "Admin" ];
		this.startDisabled = true;

		this.load("games", { games : {}, debug: false }).then(object => {
			this.games = {};
			for (var [channel_id, object] of Object.entries(object.games)) {
				this.games[channel_id] = new Game(this)
				this.games[channel_id].reload(object);
			}
			this.debug = object.debug;
			this.ready = true;
		});
	}

	getRankEmoji(rank) {
		if (rank < 4) return ["🥇", "🥈", "🥉"][rank - 1];
		return "🏅";
	}

	command(message, args, kwargs, flags) {
		message.delete();

		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			if (!game.order.includes(message.author.id)) {
				game.players[message.author.id] = new Player(message.author, game);
				game.order.push(message.author.id);

				message.author.send("Vous avez rejoint la partie. Vous êtes placé à la " + game.order.length + (game.order.length == 1 ? "ère" : "ème") + " place dans l'ordre");
				game.sendBoard().then(() => {game.save();});
			} else {
				var player = game.players[message.author.id];

				if (player.pushedBackUpOnce) {
					message.author.send("Vous avez déjà été déplacé dans l'ordre, attendez le prochain lancer");
				} else {
					var index = game.order.indexOf(message.author.id);
					var position = 1;
					if (index === 0) {
						if (!args.length || isNaN(args[0])) {
							message.author.send("En tant que premier joueur, précisez à quelle place vous voulez être ré-inséré");
							return;
						} else {
							position = Number(args[0]);
							if (position < 2 || position > game.order.length) {
								message.author.send("Index invalide");
								return;
							}
						}
					}

					game.order.splice(index, 1);
					game.order.splice(position - 1, 0, message.author.id);

					player.pushedBackUpOnce = true;

					//message.reply("Vous avez été remonté dans l'ordre. Vous êtes maintenant à la 1ère place");
					game.sendBoard().then(() => {game.save();});
				}
			}
		}
	}

	com_rank(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			var sorted = Object.values(game.players).sort((a, b) => b.score != a.score ? b.score - a.score : b.index - a.index);

			message.reply(
				new MessageEmbed()
				.setTitle("[STEEPLE CHAISE] Classement")
				.setColor(this.color)
				.addField("Joueurs", sorted.reduce((buffer, e) => {
					if (e.score < buffer.lastScore) {
						buffer.lastScore = e.score;
						buffer.lastIndex = e.index;
						buffer.rank++;
					} else if (e.index < buffer.lastIndex) {
						buffer.lastIndex = e.index;
						buffer.rank++;
					}
					buffer.message += this.getRankEmoji(buffer.rank) + " **" + buffer.rank + ".** " + (e.user ? e.user.toString() : "Joueur non trouvé") + "\n";
					return buffer;
				}, {message: "", rank: 0, lastScore: Infinity, lastIndex: Infinity}).message, true)
				.addField("Scores", sorted.map(e => "**" + e.score + "** 🔄 | **" + (e.index + 1) + "** 🪑").join("\n"), true)
			)
		}

		message.delete();
	}

	com_show(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			game.resendMessage();
		}

		message.delete();
	}

	com_logs(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			var game = this.games[message.channel.id];
			game.sendLogs(message.author);
		}

		message.delete();
	}

	com_start(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = false;
				this.games[message.channel.id].setupTimeout(false);
				message.reply("Unpaused");
			} else {
				this.games[message.channel.id] = new Game(this, message);
			};
		};
	}

	com_stop(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].paused = true;
				clearTimeout(this.games[message.channel.id].timeout);
				message.reply("Paused");
			};
		};
	}

	com_delete(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				this.games[message.channel.id].delete_save();
				delete this.games[message.channel.id];
				message.reply("Deleted");
			};
		};
	}

	com_debug(message, args, kwargs, flags) {
		if (message.user.id === process.env.ADMIN) {
			this.debug = !this.debug
			this.load("games").then(object =>{
				object.debug = this.debug;
				this.save("games", object);
				message.reply(this.debug);
			});
		}
	}

	com_turn(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			if (this.pseudo_auth.includes(message.author.id)) {
				var game = this.games[message.channel.id];
				game.throwDice();
			}

			message.delete();
		}
	}

	com_wait(message, args, kwargs, flags) {
		if (this.games[message.channel.id]) {
			if (this.pseudo_auth.includes(message.author.id)) {
				var game = this.games[message.channel.id];
				game.waitDuration = Object.keys(kwargs).reduce((acc, element) => {
					acc[element] = Number(kwargs[element]);
					return acc;
				}, {});
				game.save();

				message.author.send("Wait duration now is " + game.waitDuration.minutes + " minutes and " + game.waitDuration.hours + " hours.");
			}

			message.delete();
		}
	}

	com_set(message, args, kwargs, flags) {
		if (this.authorize(message, this.pseudo_auth)) {
			if (this.games[message.channel.id]) {
				var game = this.games[message.channel.id];
				var user = this.client.getUserFromMention(args[1])

				if (!game.players[user.id]) {
					game.players[user.id] = new Player(user, game);
				}

				var player = game.players[user.id];
				Object.keys(kwargs).forEach(key => {
					player[key] = kwargs[key];
				});

				this.games[message.channel.id].save();
				message.reply("Set " + player.user.username + ": " + Object.keys(kwargs).map(k => k + "=" + player[k]).join(", "));
			};
		}
	}
}

module.exports = exports = {MainClass}
