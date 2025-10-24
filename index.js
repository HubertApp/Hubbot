require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { google } = require("googleapis");
const path = require("path");

const app = express();
const port = process.env.PORT || 8080;

// === Discord Client ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// === Google Service Account ===
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, "service-account-bot.json"),
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
  ],
});

const drive = google.drive({ version: "v3", auth });
const docs = google.docs({ version: "v1", auth });

// === Liste des commandes ===
const commandsList = `
**Commandes disponibles :**
1. \`help\` - Affiche cette liste de commandes.
2. \`github\` - Donne le lien vers le GitHub.
3. \`trello\` - Donne le lien vers le Trello.
4. \`drive\` - Donne le lien vers le Google Drive.
5. \`ChatGPT\` - Donne le lien du GPT du projet.
6. \`!ask [votre question]\` - Pose une question à Hubert en utilisant le contexte des documents Google Drive.
`;

// === Fonctions Google Drive ===
async function listFilesInFolder(folderId) {
  let files = [];
  async function recursiveList(currentFolderId) {
    const res = await drive.files.list({
      q: `'${currentFolderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
    });

    for (const file of res.data.files) {
      if (file.mimeType === "application/vnd.google-apps.folder") {
        await recursiveList(file.id);
      } else {
        files.push(file);
      }
    }
  }
  await recursiveList(folderId);
  return files;
}

async function readGoogleDoc(docId) {
  const res = await docs.documents.get({ documentId: docId });
  const content = res.data.body.content;
  let text = "";

  for (const element of content) {
    if (element.paragraph) {
      for (const paraElement of element.paragraph.elements) {
        text += paraElement.textRun?.content || "";
      }
      text += "\n";
    }
  }

  return text;
}

async function buildProjectContext(folderId) {
  const files = await listFilesInFolder(folderId);
  let context = "";

  for (const file of files) {
    if (file.mimeType === "application/vnd.google-apps.document") {
      const docText = await readGoogleDoc(file.id);
      context += `### ${file.name}\n${docText}\n\n`;
    } else {
      context += `### ${file.name} (non-Google Doc)\n[Contenu non extrait]\n\n`;
    }
  }

  return context;
}

// === Discord Events ===
client.once("ready", () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "les demandes '!ask' pour HubertApp", type: 2 }], // 0 = PLAYING
    status: "online"
  });
  console.log("🎮 Activité définie avec succès");

});

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Erreur de connexion au bot Discord:", err.message);
});

// === Express Webhook ===
app.use(express.json());

app.post("/github-webhook", (req, res) => {
  const { repository, pusher, commits } = req.body;
  if (!repository || !pusher || !commits)
    return res.status(400).send("Données invalides");

  const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
  if (channel) {
    const commitMessages = commits
      .map((c) => `- [${c.id.substring(0, 7)}] ${c.message}`)
      .join("\n");
    const message = `🚀 **Push détecté !**\n📂 Repo: **${repository.name}**\n👤 Auteur: **${pusher.name}**\n\n${commitMessages}`;
    channel.send(message);
  }

  res.status(200).send("OK");
});

// === Gestion des messages ===
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();

  if (message.content.startsWith("!ask")) {
    await message.reply("Hubert réfléchit 🧠...");
    const userQuery = message.content.slice(5).trim();
    if (!userQuery) return message.reply("Que voulez-vous Sir 🧐 ?");

    try {
      // 🔹 Récupérer tous les fichiers du dossier
      const files = await listFilesInFolder(process.env.GOOGLE_DRIVE_FOLDER_ID);
      const lowerQuestion = userQuery.toLowerCase();

      // 🔹 Si l'utilisateur demande explicitement un document
      if (
        [
          "envoie",
          "montre",
          "partage",
          "donne",
          "affiche",
          "ouvre",
          "doc",
          "document",
          "fichier",
        ].some((mot) => lowerQuestion.includes(mot))
      ) {
        // Recherche d’un nom correspondant dans les fichiers
        const matchingFile = files.find((f) =>
          lowerQuestion.includes(f.name.toLowerCase().split(".")[0])
        );

        if (matchingFile) {
          // 🔹 Génère un lien d’accès au doc (affichage web)
          const fileLink = `https://drive.google.com/file/d/${matchingFile.id}/view?usp=sharing`;

          await message.reply(
            `Voici le document **${matchingFile.name}** que vous cherchez, Sir :\n${fileLink}`
          );

          return; // ⛔️ On s’arrête là (pas d’appel à Mistral)
        }
      }

      // 🔹 Sinon, on passe à la réflexion normale

      const context = await buildProjectContext(
        process.env.GOOGLE_DRIVE_FOLDER_ID
      );

      const fullPrompt = `
Tu es Hubert, un ingénieur anglais de l'air industriel, expert en documentation technique et gestion de projets.
Tu aides toujours l'utilisateur à comprendre ou résumer des concepts et fournir des instructions claires et précises.
Tu es poli, professionnel et structuré, mais tu peux rester concis quand c’est approprié.
Réponds toujours en français, sauf si l'utilisateur demande spécifiquement de répondre en anglais.
Quand tu réponds à une personne, utilise un ton amical et engageant, en intégrant des touches d'humour léger lorsque c'est pertinent.
Et surtout, appelle la personne "Sir" en la vouvoyant.

Contexte du projet :
${context}

Question :
${userQuery}

Réponse :
`;

      const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral",
          prompt: fullPrompt,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const text = await response.text();
      const lines = text.trim().split("\n");
      let mistralReply = "";
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          mistralReply += json.response || "";
        } catch { }
      }

      await message.reply(mistralReply || "Pas de réponse 🤔");
    } catch (err) {
      console.error("Erreur Mistral ou Google Drive:", err);
      await message.reply("Erreur de communication avec Mistral 😅");
    }

    return;
  }

  // Commandes simples
  if (message.mentions.has(client.user))
    message.reply(`Oui Sir ${message.author} ?`);
  else if (content === "help") message.reply(commandsList);
  else if (content === "favé") message.reply("FAVEEE À LA BARRRE");
  else if (content === "on mange quoi ce soir ?") message.reply("sale");
  else if (content === "github") message.reply("https://github.com/HubertApp");
  else if (content === "drive" || content === "google")
    message.reply(
      "https://drive.google.com/drive/u/0/folders/1ekO2RrUY9BrBj8KNIkQpxN_No5PDNRoD"
    );
  else if (content === "trello")
    message.reply("https://trello.com/b/EMGM0wZY/hubertapp");
  else if (content === "chatgpt" || content === "gpt")
    message.reply(
      "https://chatgpt.com/share/689c4aba-ffec-800e-a1cc-f0b6bc5daced"
    );

  console.log(`Hubert a répondu au 📩 : ${content} de ${message.author}`);
});

// === Démarrage serveur Express ===
app.listen(port, "0.0.0.0", () => console.log(`🌍 Serveur en écoute sur le port ${port}`));
