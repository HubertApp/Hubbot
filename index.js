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

// Lorsque le bot reçoit un message
client.on('messageCreate', async (message) => {
    // Ignorer les messages du bot lui-même
    if (message.author.bot) return;

    // Vérifier si le message contient la commande "cls --X"
    const args = message.content.split(' ');
    if (args[0].toLowerCase() === 'cls' && args[1] && args[1].startsWith('--')) {
        const minutes = parseInt(args[1].substring(2), 10);
        if (isNaN(minutes) || minutes <= 0) {
            message.channel.send('Veuillez spécifier un nombre valide de minutes.');
            return;
        }

        // Calculer le timestamp limite
        const limitTime = Date.now() - minutes * 60 * 1000;

        // Récupérer tous les messages du canal
        const messages = await message.channel.messages.fetch({ limit: 100 });
        const messagesToDelete = messages.filter(msg => msg.createdTimestamp < limitTime);

        // Supprimer les messages ciblés
        if (messagesToDelete.size > 0) {
            await message.channel.bulkDelete(messagesToDelete);
            message.channel.send(`Suppression de ${messagesToDelete.size} messages âgés de plus de ${minutes} minutes.`);
        } else {
            message.channel.send(`Aucun message à supprimer. Aucun message n'est plus vieux que ${minutes} minutes.`);
        }
    }
});


// Démarre le serveur Express
app.listen(port, () => {
    console.log(`Serveur en écoute sur le port ${port}`);
});
