const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ActivityType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* ================== CONFIG ================== */

const changelogRoles = ["CEO", "Head Admin"];
const giveawayColor = "#9b59b6";
const panelColor = "#2b2d31";

/* ================== READY ================== */

client.once("ready", () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}`);
  client.user.setPresence({
    status: "dnd",
    activities: [{ name: "Hounds.lol", type: ActivityType.Watching }]
  });
});

/* ================== TIME PARSER ================== */

function parseTime(input) {
  const match = input.match(/(\d+)(s|m|h|d)/);
  if (!match) return null;
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(match[1]) * map[match[2]];
}

/* ================== CHANGELOG PANEL ================== */

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "!changelog") {
    const hasPerm = message.member.roles.cache.some(r =>
      changelogRoles.includes(r.name)
    );
    if (!hasPerm) return message.reply("❌ Brak uprawnień.");

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Hounds.lol | Changelog Panel" })
      .setDescription("Kliknij przycisk, aby dodać changelog.")
      .setColor(panelColor);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_changelog")
        .setLabel("📝 Wypełnij changelog")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }

  if (message.content === "!giveaway") {
    const embed = new EmbedBuilder()
      .setAuthor({ name: "🎁 Giveaway Panel" })
      .setDescription("Utwórz giveaway w kilka sekund.")
      .setColor(panelColor);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_giveaway")
        .setLabel("🎉 Utwórz giveaway")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ================== BUTTONS ================== */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  /* ---- CHANGELOG MODAL ---- */
  if (interaction.customId === "open_changelog") {
    const modal = new ModalBuilder()
      .setCustomId("changelog_modal")
      .setTitle("Dodaj changelog");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Tytuł")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("type")
          .setLabel("Dodano / Naprawiono / Usunięto")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("desc")
          .setLabel("Opis zmian")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ping")
          .setLabel("Ping everyone? (tak / nie)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  /* ---- GIVEAWAY MODAL ---- */
  if (interaction.customId === "open_giveaway") {
    const modal = new ModalBuilder()
      .setCustomId("giveaway_modal")
      .setTitle("Utwórz giveaway");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("time")
          .setLabel("Czas (np. 10m, 1h)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("winners")
          .setLabel("Ilość wygranych")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("ping")
          .setLabel("Ping everyone? (tak / nie)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }
});

/* ================== MODALS ================== */

client.on("interactionCreate", async interaction => {
  if (!interaction.isModalSubmit()) return;

  /* ---- CHANGELOG SEND ---- */
  if (interaction.customId === "changelog_modal") {
    const title = interaction.fields.getTextInputValue("title");
    const type = interaction.fields.getTextInputValue("type");
    const desc = interaction.fields.getTextInputValue("desc");
    const ping = interaction.fields.getTextInputValue("ping");

    const colors = {
      dodano: "Green",
      naprawiono: "Yellow",
      usunięto: "Red"
    };

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setColor(colors[type.toLowerCase()] || "Blue")
      .addFields(
        { name: "🗂 Typ", value: type, inline: true },
        { name: "👤 Autor", value: interaction.user.tag, inline: true },
        { name: "📄 Zmiany", value: desc }
      )
      .setTimestamp();

    await interaction.channel.send({
      content: ping.toLowerCase() === "tak" ? "@everyone" : null,
      embeds: [embed]
    });

    return interaction.reply({ content: "✅ Changelog dodany!", ephemeral: true });
  }

  /* ---- GIVEAWAY START ---- */
  if (interaction.customId === "giveaway_modal") {
    const timeRaw = interaction.fields.getTextInputValue("time");
    const winnersCount = parseInt(
      interaction.fields.getTextInputValue("winners")
    );
    const ping = interaction.fields.getTextInputValue("ping");

    const timeMs = parseTime(timeRaw);
    if (!timeMs) {
      return interaction.reply({
        content: "❌ Zły format czasu.",
        ephemeral: true
      });
    }

    const users = new Set();
    const endTime = Date.now() + timeMs;

    const embed = new EmbedBuilder()
      .setTitle("🎉 GIVEAWAY 🎉")
      .setColor(giveawayColor)
      .addFields(
        { name: "⏳ Pozostały czas", value: timeRaw, inline: true },
        { name: "👥 Uczestnicy", value: "0", inline: true }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("join_giveaway")
        .setLabel("🎉 Dołącz")
        .setStyle(ButtonStyle.Success)
    );

    const msg = await interaction.channel.send({
      content: ping.toLowerCase() === "tak" ? "@everyone" : null,
      embeds: [embed],
      components: [row]
    });

    interaction.reply({ content: "✅ Giveaway utworzony!", ephemeral: true });

    const collector = msg.createMessageComponentCollector({ time: timeMs });

    const interval = setInterval(async () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) return;

      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);

      embed.setFields(
        { name: "⏳ Pozostały czas", value: `${m}m ${s}s`, inline: true },
        { name: "👥 Uczestnicy", value: `${users.size}`, inline: true }
      );

      await msg.edit({ embeds: [embed] });
    }, 10000);

    collector.on("collect", i => {
      users.add(i.user.id);
      i.reply({ content: "🎉 Dołączono!", ephemeral: true });
    });

    collector.on("end", async () => {
      clearInterval(interval);

      const winners = [...users]
        .sort(() => 0.5 - Math.random())
        .slice(0, winnersCount);

      embed.setFields(
        { name: "⏰ Status", value: "Zakończony", inline: true },
        { name: "👥 Uczestnicy", value: `${users.size}`, inline: true }
      );

      await msg.edit({ embeds: [embed], components: [] });

      interaction.channel.send(
        winners.length
          ? `🎉 **Wygrani:** ${winners.map(id => `<@${id}>`).join(", ")}`
          : "❌ Brak uczestników."
      );
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

client.login(process.env.DISCORD_TOKEN);

