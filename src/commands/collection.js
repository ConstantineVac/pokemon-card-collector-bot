const { getDatabase } = require('../database');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder } = require('discord.js');

const itemsPerPage = 5;

module.exports = {
    name: 'collection',
    description: 'View your cards.',

    async execute(interaction, pageNumber = 1) {
        try {
             /// Get the server (guild) ID from the interaction
             const serverId = interaction.guild.id;

             // Dynamically create the collection name for server-specific user profiles
             const userProfileCollectionName = `server_${serverId}_userProfiles`;
             const userProfileCollection = getDatabase().collection(userProfileCollectionName);
 
             // Retrieve the user's ID from the interaction
             const userId = interaction.user.id;
 
             // Find the user profile in the database
             const userProfile = await userProfileCollection.findOne({ userId });

             if (userProfile) {
                const cardsPerPage = userProfile.cards.slice((pageNumber - 1) * itemsPerPage, pageNumber * itemsPerPage);
            
                const embed = new EmbedBuilder()
                    .setTitle('Your Card Collection')
                    .setDescription('Card Name - Set - Card Number - #Copies')
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setColor('#3498db');
            
                let counter = (pageNumber - 1) * itemsPerPage + 1;
            
                for (const card of cardsPerPage) {
                    const cardInfo = await getDatabase().collection('Cards').findOne({ id: card.id });
            
                    embed.addFields(
                        { name: `\`${counter}\` Card:`, value: `- \`${cardInfo.name} - ${cardInfo.set.name} - ${cardInfo.number} - ${card.amount.toString()}\`` }
                    );
            
                    counter++;
                }
            
                // Add pagination information
                const totalPages = Math.ceil(userProfile.cards.length / itemsPerPage);
                embed.setFooter({ text: `Page ${pageNumber}/${totalPages}` });
            
                // Create buttons for navigating between pages
                const previousButton = new ButtonBuilder()
                    .setCustomId(`previousPageCollection_${Math.max(1, pageNumber - 1)}`)
                    .setLabel('Previous Page')
                    .setStyle(4)
                    .setDisabled(pageNumber === 1); // Disable if this is the first page

                const nextButton = new ButtonBuilder()
                    .setCustomId(`nextPageCollection_${pageNumber + 1}`)
                    .setLabel('Next Page')
                    .setStyle(3)
                    .setDisabled(pageNumber === totalPages); // Disable if this is the last page

                // Create an action row for the buttons
                const actionRow = new ActionRowBuilder().addComponents(previousButton, nextButton);

                // Check if this is a button interaction and update the message
                if (interaction.isButton()) {
                    interaction.update({ embeds: [embed], components: [actionRow], ephemeral: true });
                } else {
                    interaction.reply({ embeds: [embed], components: [actionRow], ephemeral:true });
                }
                } else {
                    interaction.reply({
                        content: 'You do not have a profile. Use `/register` to register a profile!',
                        ephemeral: true,
                    });
                }
                
        } catch (error) {
            console.error('Error:', error);
            interaction.reply('An error occurred while fetching your card collection. Please try again later.');
        }
    },
};


