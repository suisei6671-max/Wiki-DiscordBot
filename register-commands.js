const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: "close",
    description: "このスレッドをクローズします"
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("コマンド登録中...");

    await rest.put(
      Routes.applicationCommands("YOUR_CLIENT_ID"),
      { body: commands }
    );

    console.log("登録完了");
  } catch (err) {
    console.error(err);
  }
})();
