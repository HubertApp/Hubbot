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
    console.log(`Connecté en tant que ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);  // Connexion avec le token du bot depuis le fichier .env

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
        const message = `Hello @everyone,\n\n🚀 **Push détecté !**\n📂 Repo: **${repository.name}**\n👤 Auteur: **${pusher.name}**\n\n${commitMessages}`;
        channel.send(message);
    }

    res.status(200).send("OK");
});

const https = require('https');

exports.handler = async (event, context) => {
 const url = process.env.RENDER_URL;

 return new Promise((resolve, reject) => {
   const req = https.get(url, (res) => {
     if (res.statusCode === 200) {
       resolve({
         statusCode: 200,
         body: 'Server pinged successfully',
       });
     } else {
       reject(
         new Error(`Server ping failed with status code: ${res.statusCode}`)
       );
     }
   });

   req.on('error', (error) => {
     reject(error);
   });

   req.end();
 });
};


// Lorsque le bot reçoit un message
client.on('messageCreate', (message) => {
    // Ignorer les messages du bot lui-même
    if (message.author.bot) return;

    // Vérifier si le message contient une mention du bot
    if (message.mentions.has(client.user)) {
        message.reply(`Oui Sir ${message.author} ?`);
    }

    // Si le message est "help"
    if (message.content.toLowerCase() === 'help') {
        message.reply(commandsList);
    }

    // Si le message est "favé"
    if (message.content.toLowerCase() === 'favé') {
        message.reply('FAVEEE A LA BARRRE');
    }

    // Si le message est "on mange quoi ce soir ?"
    if (message.content.toLowerCase() === 'on mange quoi ce soir ?') {
        message.reply('sale');
    }

    if (message.content.toLowerCase() === 'github') {
        message.reply('https://github.com/HubertApp');
    }

    if (message.content.toLowerCase() === 'drive' || message.content.toLowerCase() === 'google') {
        message.reply('https://drive.google.com/drive/u/0/folders/1ekO2RrUY9BrBj8KNIkQpxN_No5PDNRoD');
    }

    if (message.content.toLowerCase() === 'trello') {
        message.reply('https://trello.com/b/EMGM0wZY/hubertapp');
    }
});

// Démarre le serveur Express
app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});
