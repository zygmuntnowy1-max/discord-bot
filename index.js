const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActivityType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* ================= CONFIG ================= */

const CHANGELOG_ROLES = ["CEO", "Head Admin"];
const PANEL_COLOR = 0x2b2d31;
const GIVEAWAY_COLOR = 0x9b59b6;

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}`);
  client.user.setPresence({
    status: "dnd",
    activities: [{ name: "Hounds.lol", type: ActivityType.Watching }]
  });
});

/* ================= UTILS ================= */

function parseTime(str) {
  const m = str.match(/(\d+)(s|m|h|d)/);
  if (!m) return null;
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(m[1]) * map[m[2]];
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ================= COMMANDS ================= */

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  /* ---- CHANGELOG PANEL ---- */
  if (message.content === "!changelog") {
    const ok = message.member.roles.cache.some(r =>
      CHANGELOG_ROLES.includes(r.name)
    );
    if (!ok) return message.reply("❌ Brak uprawnień.");

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Hounds.lol | Changelog Panel" })
      .setDescription("Kliknij przycisk, aby dodać changelog.")
      .setColor(PANEL_COLOR);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("changelog_open")
        .setLabel("📝 Wypełnij changelog")
        .setStyle(ButtonStyle.Success)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }

  /* ---- GIVEAWAY PANEL ---- */
  if (message.content === "!giveaway") {
    const embed = new EmbedBuilder()
      .setAuthor({ name: "🎁 Giveaway Panel" })
      .setDescription("Utwórz giveaway z automatycznym liczeniem.")
      .setColor(PANEL_COLOR);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("giveaway_open")
        .setLabel("🎉 Utwórz giveaway")
        .setStyle(ButtonStyle.Primary)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ================= INTERACTIONS ================= */

client.on("interactionCreate", async interaction => {
  /* ---------- BUTTONS ---------- */
  if (interaction.isButton()) {
    /* CHANGELOG */
    if (interaction.customId === "changelog_open") {
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

    /* GIVEAWAY */
    if (interaction.customId === "giveaway_open") {
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
            .setLabel("Ilu wygranych?")
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

    /* JOIN GIVEAWAY */
    if (interaction.customId.startsWith("join_")) {
      const users = giveaways.get(interaction.customId);
      if (users.has(interaction.user.id)) {
        return interaction.reply({ content: "❌ Już bierzesz udział.", ephemeral: true });
      }
      users.add(interaction.user.id);
      return interaction.reply({ content: "🎉 Dołączono!", ephemeral: true });
    }
  }

  /* ---------- MODALS ---------- */
  if (interaction.isModalSubmit()) {
    /* CHANGELOG SEND */
    if (interaction.customId === "changelog_modal") {
      const title = interaction.fields.getTextInputValue("title");
      const type = interaction.fields.getTextInputValue("type");
      const desc = interaction.fields.getTextInputValue("desc");
      const ping = interaction.fields.getTextInputValue("ping");

      const colors = {
        dodano: 0x2ecc71,
        naprawiono: 0xf1c40f,
        usunięto: 0xe74c3c
      };

      const embed = new EmbedBuilder()
        .setTitle(`📢 ${title}`)
        .setColor(colors[type.toLowerCase()] || PANEL_COLOR)
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

    /* GIVEAWAY START */
    if (interaction.customId === "giveaway_modal") {
      const timeRaw = interaction.fields.getTextInputValue("time");
      const winnersCount = parseInt(
        interaction.fields.getTextInputValue("winners")
      );
      const ping = interaction.fields.getTextInputValue("ping");

      const timeMs = parseTime(timeRaw);
      if (!timeMs)
        return interaction.reply({ content: "❌ Zły format czasu.", ephemeral: true });

      const users = new Set();
      const end = Date.now() + timeMs;
      const id = `join_${Date.now()}`;

      giveaways.set(id, users);

      const embed = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY 🎉")
        .setColor(GIVEAWAY_COLOR)
        .addFields(
          { name: "⏳ Pozostały czas", value: formatTime(timeMs), inline: true },
          { name: "👥 Uczestnicy", value: "0", inline: true }
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(id)
          .setLabel("🎉 Dołącz")
          .setStyle(ButtonStyle.Success)
      );

      const msg = await interaction.channel.send({
        content: ping === "tak" ? "@everyone" : null,
        embeds: [embed],
        components: [row]
      });

      interaction.reply({ content: "✅ Giveaway utworzony!", ephemeral: true });

      const interval = setInterval(async () => {
        const left = end - Date.now();
        if (left <= 0) return;

        const updated = EmbedBuilder.from(msg.embeds[0])
          .setFields(
            { name: "⏳ Pozostały czas", value: formatTime(left), inline: true },
            { name: "👥 Uczestnicy", value: `${users.size}`, inline: true }
          );

        await msg.edit({ embeds: [updated] });
      }, 10000);

      setTimeout(async () => {
        clearInterval(interval);

        const winners = [...users]
          .sort(() => 0.5 - Math.random())
          .slice(0, winnersCount);

        const finalEmbed = EmbedBuilder.from(msg.embeds[0])
          .setFields(
            { name: "⏰ Status", value: "Zakończony", inline: true },
            { name: "👥 Uczestnicy", value: `${users.size}`, inline: true }
          );

        await msg.edit({ embeds: [finalEmbed], components: [] });

        interaction.channel.send(
          winners.length
            ? `🎉 **Wygrani:** ${winners.map(id => `<@${id}>`).join(", ")}`
            : "❌ Brak uczestników."
        );

        giveaways.delete(id);
      }, timeMs);
    }
  }
});

/* ================= STORAGE ================= */

const giveaways = new Map();

/* ================= LOGIN ================= */

client.login(process.env.DISCORD_TOKEN);
