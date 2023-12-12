const { getDatabase } = require('../database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    
        name: 'profile',
        description: 'View user profile',
    
    async execute(interaction) {
        try {
            const database = getDatabase();
            const serverId = interaction.guild.id;
            const userId = interaction.user.id;

            // Get the server's user profiles collection
            const profilesCollection = database.collection(`server_${serverId}_userProfiles`);

            // Find the user's profile
            const userProfile = await profilesCollection.findOne({ userId });

            if (userProfile) {
                // Simulate fetching exchange rates (replace with a real API call)
                const exchangeRateUSD = 1.18; // Replace with the actual rate
                const exchangeRateEUR = 0.85; // Replace with the actual rate

                const totalValueUSD = userProfile.portfolioValue * exchangeRateUSD;
                const totalValueEUR = userProfile.portfolioValue * exchangeRateEUR;

                // Create an embed using EmbedBuilder
                const embed = new EmbedBuilder()
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setAuthor({
                    name: interaction.user.tag,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                })
                .addFields([
                    { name: 'Number of Cards:', value: userProfile.cards.length.toString(), inline: true },
                    {
                        name: 'Portfolio Value',
                        value: `${userProfile.portfolioValue.toString()} USD (${totalValueEUR.toFixed(2)} EUR)`,
                        inline: false,
                    },
                ])
                .setColor('#3498db');
                embed.setTimestamp();

             // Send the embed as a reply
             await interaction.reply({ embeds: [embed] });
            } else {
                // Send a simple text reply if the user is not registered
                await interaction.reply('You are not registered. Use `/register` to create a profile.');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            await interaction.reply('An error occurred while fetching your profile. Please try again later.');
        }
    },
};
