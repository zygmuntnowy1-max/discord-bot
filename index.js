const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ActivityType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* ================== ROLE ================== */

const staffRoles = [
  "CEO",
  "Head Admin",
  "Admin",
  "Moderator",
  "Support",
  "Trial Support"
];

const changelogRoles = ["CEO", "Head Admin"];

function getStaffRoleOverwrites(guild) {
  const roles = guild.roles.cache.filter(r =>
    staffRoles.includes(r.name)
  );

  return roles.map(role => ({
    id: role.id,
    allow: [PermissionsBitField.Flags.ViewChannel]
  }));
}

/* ================== READY + STATUS ================== */

client.once("ready", () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}`);

  client.user.setPresence({
    status: "dnd",
    activities: [
      {
        name: "VHS Community Reborn",
        type: ActivityType.Watching
      }
    ]
  });
});

/* ================== WELCOME ================== */

client.on("guildMemberAdd", member => {
  const channel = member.guild.channels.cache.find(
    ch => ch.name === "🛬┇welcome"
  );

  if (!channel) return;

  channel.send(
    `🛬┇welcome ${member}, Właśnie dołączył do **VHS Community Reborn!**`
  );
});

/* ================== TICKETY PANEL ================== */

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "!ticket") {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Panel")
      .setDescription("Wybierz kategorię ticketu")
      .setColor("Blue");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Wybierz kategorię...")
      .addOptions([
        { label: "Pomoc", value: "Pomoc" },
        { label: "Współpraca", value: "Współpraca" },
        { label: "Media", value: "Media" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ================== TWORZENIE TICKETA ================== */

client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "ticket_select") return;

  const overwrites = [
    {
      id: interaction.guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel]
    },
    ...getStaffRoleOverwrites(interaction.guild)
  ];

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites
  });

  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticket")
    .setDescription(
      `Kategoria: **${interaction.values[0]}**\n\nOpisz swój problem.`
    )
    .setColor("Blue");

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("close_ticket")
      .setLabel("🔒 Zamknij")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("delete_ticket")
      .setLabel("🗑 Usuń")
      .setStyle(ButtonStyle.Danger)
  );

  channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [buttons]
  });

  interaction.reply({ content: "✅ Ticket utworzony!", ephemeral: true });
});

/* ================== LOGI TICKETÓW ================== */

async function fetchTicketMessages(channel) {
  let messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      before: lastId
    });

    if (fetched.size === 0) break;

    fetched.forEach(msg => {
      messages.push(
        `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}`
      );
    });

    lastId = fetched.last().id;
  }

  return messages.reverse().join("\n");
}

/* ================== PRZYCISKI TICKETA ================== */

client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  const channel = interaction.channel;

  const isStaff = interaction.member.roles.cache.some(r =>
    staffRoles.includes(r.name)
  );

  // Zamknij
  if (interaction.customId === "close_ticket") {
    const logChannel = interaction.guild.channels.cache.find(
      ch => ch.name === "logi-ticket"
    );

    const transcript = await fetchTicketMessages(channel);

    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("🔒 Ticket zamknięty")
            .setColor("Orange")
            .addFields(
              { name: "Kanał", value: channel.name, inline: true },
              { name: "Zamknął", value: interaction.user.tag, inline: true }
            )
            .setTimestamp()
        ],
        files: [
          {
            attachment: Buffer.from(transcript || "Brak wiadomości"),
            name: `${channel.name}.txt`
          }
        ]
      });
    }

    await interaction.reply({ content: "🔒 Ticket zamknięty", ephemeral: true });
  }

  // Usuń
  if (interaction.customId === "delete_ticket") {
    if (!isStaff) {
      return interaction.reply({
        content: "❌ Tylko staff może usunąć ticket.",
        ephemeral: true
      });
    }

    const logChannel = interaction.guild.channels.cache.find(
      ch => ch.name === "logi-ticket"
    );

    const transcript = await fetchTicketMessages(channel);

    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("🗑 Ticket usunięty")
            .setColor("Red")
            .addFields(
              { name: "Kanał", value: channel.name, inline: true },
              { name: "Usunął", value: interaction.user.tag, inline: true }
            )
            .setTimestamp()
        ],
        files: [
          {
            attachment: Buffer.from(transcript || "Brak wiadomości"),
            name: `${channel.name}.txt`
          }
        ]
      });
    }

    await interaction.reply("🗑 Ticket zostanie usunięty za 5 sekund...");
    setTimeout(() => channel.delete(), 5000);
  }
});

/* ================== CHANGELOG ================== */

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.content !== "!changelog") return;

  const hasPerm = message.member.roles.cache.some(r =>
    changelogRoles.includes(r.name)
  );

  if (!hasPerm) {
    return message.reply("❌ Nie masz uprawnień.");
  }

  const embed = new EmbedBuilder()
    .setTitle("📢 Changelog")
    .setDescription("Wybierz typ changeloga")
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("changelog_add")
      .setLabel("🟢 Dodano")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("changelog_fix")
      .setLabel("🟡 Naprawiono")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("changelog_remove")
      .setLabel("🔴 Usunięto")
      .setStyle(ButtonStyle.Danger)
  );

  message.channel.send({ embeds: [embed], components: [row] });
});

/* ================== GIVEAWAY ================== */

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (message.content !== "!giveaway") return;

  message.channel.send(
    "Podaj: `czas | wygrani | rola/brak | ping`\nPrzykład: `10m | 1 | Support | ping`"
  );

  const collected = await message.channel.awaitMessages({
    filter: m => m.author.id === message.author.id,
    max: 1,
    time: 60000
  });

  if (!collected.size) return;

  const [timeRaw, winnersRaw, roleRaw, pingRaw] =
    collected.first().content.split("|").map(x => x.trim());

  const timeMs =
    timeRaw.endsWith("m")
      ? parseInt(timeRaw) * 60000
      : parseInt(timeRaw) * 1000;

  const winnersCount = parseInt(winnersRaw);
  const role =
    roleRaw !== "brak"
      ? message.guild.roles.cache.find(r => r.name === roleRaw)
      : null;

  const embed = new EmbedBuilder()
    .setTitle("🎉 GIVEAWAY 🎉")
    .setDescription(
      `⏰ Czas: ${timeRaw}\n🏆 Wygrani: ${winnersCount}\n📌 Rola: ${
        role ? role.name : "Brak"
      }`
    )
    .setColor("Purple");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("giveaway_join")
      .setLabel("🎉 Dołącz")
      .setStyle(ButtonStyle.Success)
  );

  const msg = await message.channel.send({
    content: pingRaw === "ping" ? "@everyone" : null,
    embeds: [embed],
    components: [row]
  });

  const users = new Set();

  const collector = msg.createMessageComponentCollector({ time: timeMs });

  collector.on("collect", i => {
    if (role && !i.member.roles.cache.has(role.id)) {
      return i.reply({
        content: "❌ Nie spełniasz wymagań.",
        ephemeral: true
      });
    }

    users.add(i.user.id);
    i.reply({ content: "✅ Dołączono!", ephemeral: true });
  });

  collector.on("end", () => {
    const winners = [...users]
      .sort(() => 0.5 - Math.random())
      .slice(0, winnersCount);

    message.channel.send(
      winners.length
        ? `🎉 Wygrani: ${winners.map(id => `<@${id}>`).join(", ")}`
        : "❌ Brak uczestników."
    );
  });
});

client.login(process.env.DISCORD_TOKEN);


