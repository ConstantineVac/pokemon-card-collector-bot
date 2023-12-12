const { getDatabase } = require('../database');

module.exports = {
    
        name: 'register',
        description: 'Register the user',
  
    async execute(interaction) {
        try {
            const userName = interaction.user.username;
            const database = getDatabase();
            const serversCollection = database.collection('servers');
            const serverId = interaction.guild.id;

            // Check if the server exists in the 'servers' collection
            const server = await serversCollection.findOne({ serverId });

            if (server) {
                // If the server exists, add the user to userProfiles
                const profilesCollection = database.collection(`server_${serverId}_userProfiles`);

                // Check if the user profile already exists
                const userProfileExists = await profilesCollection.findOne({ userId: interaction.user.id });

                if (!userProfileExists) {
                    // Insert the user's profile into the server's collection
                    await profilesCollection.insertOne({
                        userId: interaction.user.id,
                        userName,
                        cards: 0,
                        portfolioValue: 0,
                        cards: [],
                    });
                    await interaction.reply('You have been registered in this server!');
                } else {
                    await interaction.reply('You are already registered in this server!');
                }
            } else {
                // If the server doesn't exist, create a new document for it
                await serversCollection.insertOne({
                    serverId,
                    userProfiles: [interaction.user.id],
                });

                // Log information to help diagnose the issue
                console.log(`Server document created for server ${serverId}`);

                // Create a new collection for userProfiles for the server
                const profilesCollection = database.collection(`server_${serverId}_userProfiles`);

                // Log information to help diagnose the issue
                console.log(`UserProfiles collection created for server ${serverId}`);

                // Insert the user's profile into the server's collection
                await profilesCollection.insertOne({
                    userId: interaction.user.id,
                    userName,
                    cards: 0,
                    portfolioValue: 0,
                    cards: [],
                });

                await interaction.reply('You have been registered in this new server!');
            }
        } catch (error) {
            console.error('Error registering user:', error);
            await interaction.reply('An error occurred while registering. Please try again later.');
        }
    },
};
