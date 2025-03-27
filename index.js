require('dotenv').config();  // Charge les variables d'environnement
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const app = express();
const port = process.env.PORT || 8080;  // Port utilisé pour l'API (Webhook GitHub)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Liste des commandes disponibles
const commandsList = `
**Commandes disponibles :**
1. \`help\` - Affiche cette liste de commandes.
2. \`github\` - Donne le lien vers le GitHub.
3. \`trello\` - Donne le lien vers le Trello.
4. \`drive\` - Donne le lien vers le Google Drive.
`;

// Lors du démarrage du bot
client.once('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    // Définition de l'activité
    setTimeout(() => {
        client.user.setActivity("Manageur d'HubertApp", { type: 'PLAYING' });
        console.log("🎮 Activité définie avec succès");
    }, 5000);

    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (!channel) {
        console.error("⚠ Le canal Discord n'a pas été trouvé. Vérifie l'ID !");
    }
});


client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("❌ Erreur de connexion au bot Discord:", err.message);
});

// Middleware pour recevoir les webhooks GitHub
app.use(express.json());

// Route pour recevoir le webhook GitHub
app.post('/github-webhook', (req, res) => {
    const { repository, pusher, commits } = req.body;
    if (!repository || !pusher || !commits) {
        return res.status(400).send("Données invalides");
    }

    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (channel) {
        const commitMessages = commits.map(commit => `- [${commit.id.substring(0, 7)}] ${commit.message}`).join("\n");
        const message = `🚀 **Push détecté !**\n📂 Repo: **${repository.name}**\n👤 Auteur: **${pusher.name}**\n\n${commitMessages}`;
        channel.send(message);
    }

    res.status(200).send("OK");
});

// Gestion des messages
client.on('messageCreate', (message) => {
    if (message.author.bot) return;  // Ignore les messages des bots

    const content = message.content.toLowerCase();

    if (message.mentions.has(client.user)) {
        message.reply(`Oui Sir ${message.author} ?`);
    } else if (content === 'help') {
        message.reply(commandsList);
    } else if (content === 'favé') {
        message.reply('FAVEEE À LA BARRRE');
    } else if (content === 'on mange quoi ce soir ?') {
        message.reply('sale');
    } else if (content === 'github') {
        message.reply('https://github.com/HubertApp');
    } else if (content === 'drive' || content === 'google') {
        message.reply('https://drive.google.com/drive/u/0/folders/1ekO2RrUY9BrBj8KNIkQpxN_No5PDNRoD');
    } else if (content === 'trello') {
        message.reply('https://trello.com/b/EMGM0wZY/hubertapp');
    }
    console.log("Hubert à répondue au 📩: " + content);
});

// Démarre le serveur Express
app.listen(port, () => {
    console.log(`🌍 Serveur en écoute sur le port ${port}`);
});
