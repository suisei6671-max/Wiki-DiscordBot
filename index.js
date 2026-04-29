const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const FORUM_ID = "1498805402152861837";

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  // 📌 !setup
  if (msg.content === "!setup") {
    const { ButtonBuilder, ButtonStyle } = require("discord.js");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("start_form")
        .setLabel("📩 依頼を作成")
        .setStyle(ButtonStyle.Primary),
    );

    await msg.channel.send({
      content: "📌 **wiki編集依頼はこちらから**",
      components: [row],
    });
  }

  const autoReact = {
    "1498624183222009947":["1454758250200174675","1458748133986271283"],
    "1498636142654787674":["⭐"],
    "1498996831894503597":["⭐"],
    "1498996989181038685":["⭐"],
    "1498636367784185867":["1456978528632574035"],
  };

  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;
  
    const reacts = autoReact[msg.channel.id];
    if (!reacts) return; // このチャンネルは対象外
  
    try {
      await Promise.all(
        reacts.map(e => msg.react(e))
      );
    } catch (err) {
      console.error("reaction error:", err);
    }
  });

  const requireFileChannels = ["1498636142654787674","1498996831894503597","1498996989181038685"];

  if (requireFileChannels.includes(msg.channel.id) && msg.attachments.size === 0) {
    try {
      await msg.delete();
    } catch (err) {
      console.error(err);
    }
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (
    interaction.isUserSelectMenu() &&
    interaction.customId === "select_user"
  ) {
    const userId = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`form_${interaction.values.join(",")}`)
      .setTitle("wiki編集依頼");

    const fields = [
      ["title", "件名", TextInputStyle.Short, true],
      ["page", "対象ページ", TextInputStyle.Short, true],
      ["section", "対象項目", TextInputStyle.Short, false],
      ["content", "内容", TextInputStyle.Paragraph, true],
      ["note", "備考", TextInputStyle.Paragraph, false],
    ];

    const rows = fields.map((f) => {
      const input = new TextInputBuilder()
        .setCustomId(f[0])
        .setLabel(f[1])
        .setStyle(f[2])
        .setRequired(f[3]);
      return new ActionRowBuilder().addComponents(input);
    });

    modal.addComponents(...rows);

    await interaction.showModal(modal);
  }

  // ボタン押したとき
  if (interaction.isButton() && interaction.customId === "start_form") {
    const {
      ActionRowBuilder,
      UserSelectMenuBuilder,
      MessageFlags,
    } = require("discord.js");

    const select = new UserSelectMenuBuilder()
      .setCustomId("select_user")
      .setPlaceholder("担当者を選択")
      .setMinValues(1)
      .setMaxValues(5); // ← 複数選択OK

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: "担当者を選択してください",
      components: [row],
      flags: MessageFlags.Ephemeral, // ← 新しい書き方
    });

    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "close") {
  
    const REQUIRED_ROLE = "1456504654799044739";
    const RESOLVED_TAG = "1498911991018946660";
  
    const member = await interaction.guild.members.fetch(interaction.user.id);
  
    // 権限チェック
    if (!member.roles.cache.has(REQUIRED_ROLE)) {
      return interaction.reply({
        content: "❌ 権限がありません",
        flags: 64
      });
    }
  
    // スレッドチェック
    if (!interaction.channel.isThread()) {
      return interaction.reply({
        content: "❌ スレッド内でのみ使用できます",
        flags: 64
      });
    }
  
    await interaction.deferReply({ flags: 64 });
  
    const thread = interaction.channel;
  
    try {
      // 現在タグ保持
      const currentTags = thread.appliedTags ?? [];
  
      const newTags = currentTags.includes(RESOLVED_TAG)
        ? currentTags
        : [...currentTags, RESOLVED_TAG];
  
      await thread.setAppliedTags(newTags);
  
      // 🔥① ロック（重要）
      await thread.setLocked(true);
  
      // 🔥② アーカイブ
      await thread.setArchived(true);
  
      await interaction.editReply("🔒 クローズ＆ロックしました");
  
    } catch (err) {
      console.error("close error:", err);
  
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ エラーが発生しました");
      } else {
        await interaction.reply({
          content: "❌ エラーが発生しました",
          flags: 64
        });
      }
    }
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith("form_")) {
    await interaction.deferUpdate();
    const forum = await client.channels.fetch(FORUM_ID);
    const userIds = interaction.customId.split("_")[1].split(",");
    const mention = userIds.map((id) => `<@${id}>`).join(", ");
    const requester = `<@${interaction.user.id}>`;

    const title = interaction.fields.getTextInputValue("title");
    const page = interaction.fields.getTextInputValue("page");
    const section = interaction.fields.getTextInputValue("section");
    const content = interaction.fields.getTextInputValue("content");
    const note = interaction.fields.getTextInputValue("note");

    const thread = await forum.threads.create({
      name: title,
      message: {
        content: "📨 依頼を作成中...",
      },
    });

    const starter = await thread.fetchStarterMessage();
    if (starter) await starter.delete();
    const lines = content ? "\t" + content.replace(/\n/g, "\n\t") : "";

    const noteLines = note ? "\t" + note.replace(/\n/g, "\n\t") : "";

    const sendLines = [
      `**依頼**:\n\t${requester}`,
      `**担当**:\n\t${mention}`,
      `**対象**:\n\t${page}${section ? " > " + section : ""}`,
      `**内容**:\n${lines}`,
      ...(note && note.trim() ? [`**備考**:\n${noteLines}`] : []),
    ];
    for (const sendLine of sendLines) {
      await thread.send(sendLine);
    }

    await interaction.editReply({
      content: `✅ [依頼](${thread.url}) を送信しました！`,
      components: [],
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(3000, () => {
  console.log("Web server started");
});
