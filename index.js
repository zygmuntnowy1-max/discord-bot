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
  InteractionType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // 🔥 TO NAPRAWIA WELCOME
  ],
  partials: [Partials.Channel]
});

client.lastPanel = null;

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}`);
});

/* ================= WELCOME ================= */

client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.find(
    ch => ch.name === "🛬┇welcome"
  );

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("👋 Nowy użytkownik!")
    .setDescription(
      `Witamy ${member} na **VHS Community Reborn**!\nMiło, że do nas dołączyłeś 💙`
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setColor("#57f287")
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

/* ================= CHANGELOG PANEL ================= */

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.content !== "!changelog") return;

  const embed = new EmbedBuilder()
    .setTitle("📢 Changelog Panel")
    .setDescription("Kliknij przycisk, aby dodać changelog.")
    .setColor("#2b2d31");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_changelog")
      .setLabel("📝 Wypełnij changelog")
      .setStyle(ButtonStyle.Success)
  );

  const panel = await message.channel.send({ embeds: [embed], components: [row] });
  client.lastPanel = panel;

  message.delete().catch(() => {});
});

/* ================= CHANGELOG MODAL ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "open_changelog") return;

  const modal = new ModalBuilder()
    .setCustomId("changelog_modal")
    .setTitle("📢 Nowy Changelog");

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
        .setCustomId("add")
        .setLabel("Co DODANO? 🟢")
        .setStyle(TextInputStyle.Paragraph)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("fix")
        .setLabel("Co NAPRAWIONO? 🟡")
        .setStyle(TextInputStyle.Paragraph)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("remove")
        .setLabel("Co USUNIĘTO? 🔴")
        .setStyle(TextInputStyle.Paragraph)
    )
  );

  interaction.showModal(modal);
});

/* ================= CHANGELOG SUBMIT ================= */

client.on("interactionCreate", async interaction => {
  if (interaction.type !== InteractionType.ModalSubmit) return;
  if (interaction.customId !== "changelog_modal") return;

  const embed = new EmbedBuilder()
    .setTitle(`📢 ${interaction.fields.getTextInputValue("title")}`)
    .setColor("#5865f2")
    .addFields(
      { name: "🟢 Dodano", value: interaction.fields.getTextInputValue("add") || "—" },
      { name: "🟡 Naprawiono", value: interaction.fields.getTextInputValue("fix") || "—" },
      { name: "🔴 Usunięto", value: interaction.fields.getTextInputValue("remove") || "—" }
    )
    .setTimestamp();

  await interaction.channel.send({
    content: "@everyone",
    embeds: [embed]
  });

  if (client.lastPanel) {
    client.lastPanel.delete().catch(() => {});
    client.lastPanel = null;
  }

  interaction.reply({ content: "✅ Changelog opublikowany.", ephemeral: true });
});

/* ================= GIVEAWAY PANEL ================= */

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.content !== "!giveaway") return;

  const embed = new EmbedBuilder()
    .setTitle("🎁 Giveaway Panel")
    .setDescription("Utwórz giveaway z automatycznym liczeniem.")
    .setColor("#2b2d31");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("open_giveaway")
      .setLabel("🎉 Utwórz giveaway")
      .setStyle(ButtonStyle.Primary)
  );

  const panel = await message.channel.send({ embeds: [embed], components: [row] });
  client.lastPanel = panel;

  message.delete().catch(() => {});
});

/* ================= GIVEAWAY MODAL ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "open_giveaway") return;

  const modal = new ModalBuilder()
    .setCustomId("giveaway_modal")
    .setTitle("🎉 Nowy Giveaway");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("prize")
        .setLabel("🎁 Co można wygrać?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("winners")
        .setLabel("👥 Ilość zwycięzców")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("time")
        .setLabel("⏱ Czas (np. 10m, 2h, 1d)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
    )
  );

  interaction.showModal(modal);
});

/* ================= GIVEAWAY START ================= */

client.on("interactionCreate", async interaction => {
  if (interaction.type !== InteractionType.ModalSubmit) return;
  if (interaction.customId !== "giveaway_modal") return;

  const prize = interaction.fields.getTextInputValue("prize");
  const winnersCount = parseInt(interaction.fields.getTextInputValue("winners"));
  const timeRaw = interaction.fields.getTextInputValue("time");

  const ms =
    timeRaw.endsWith("d") ? parseInt(timeRaw) * 86400000 :
    timeRaw.endsWith("h") ? parseInt(timeRaw) * 3600000 :
    parseInt(timeRaw) * 60000;

  const end = Math.floor((Date.now() + ms) / 1000);
  const participants = new Set();

  const embed = new EmbedBuilder()
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(
      `🎁 **Nagroda:** ${prize}\n👥 **Wygrani:** ${winnersCount}\n⏳ **Koniec:** <t:${end}:R>`
    )
    .setColor("#f1c40f");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("join_giveaway")
      .setLabel("🎉 Dołącz")
      .setStyle(ButtonStyle.Success)
  );

  const msg = await interaction.channel.send({
    content: "@everyone",
    embeds: [embed],
    components: [row]
  });

  if (client.lastPanel) {
    client.lastPanel.delete().catch(() => {});
    client.lastPanel = null;
  }

  interaction.reply({ content: "✅ Giveaway wystartował!", ephemeral: true });

  const collector = msg.createMessageComponentCollector({ time: ms });

  collector.on("collect", i => {
    participants.add(i.user.id);
    i.reply({ content: "✅ Bierzesz udział!", ephemeral: true });
  });

  collector.on("end", async () => {
    const winners = [...participants]
      .sort(() => 0.5 - Math.random())
      .slice(0, winnersCount);

    await msg.edit({
      embeds: [
        EmbedBuilder.from(embed)
          .setFooter({ text: `⏱ Zakończono <t:${Math.floor(Date.now()/1000)}:R>` })
      ],
      components: []
    });

    msg.channel.send(
      winners.length
        ? `🎉 **Wygrani:** ${winners.map(id => `<@${id}>`).join(", ")}`
        : "❌ Brak uczestników."
    );
  });
});

client.login(process.env.DISCORD_TOKEN);
