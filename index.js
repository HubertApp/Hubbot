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

// Lors du démarrage du bot
client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);  // Connexion avec le token du bot depuis le fichier .env

// Middleware pour recevoir les webhooks GitHub
app.use(express.json());

// Route pour recevoir le webhook GitHub
app.post('https://hubbot-hors.onrender.com/github-webhook', (req, res) => {
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

// Lorsque le bot reçoit un message
client.on('messageCreate', (message) => {
    // Ignorer les messages du bot lui-même
    if (message.author.bot) return;

    // Vérifier si le message contient une mention du bot
    if (message.mentions.has(client.user)) {
        message.reply('Oui Sir Noé ?');
    }

    // Si le message est "favé"
    if (message.content.toLowerCase() === 'favé') {
        message.reply('FAVEEE A LA BARRRE');
    }
});

// Démarre le serveur Express
app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});
