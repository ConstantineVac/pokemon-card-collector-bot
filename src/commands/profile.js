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
            const member = await interaction.guild.members.fetch(interaction.user.id);

            // Get the server's user profiles collection
            const profilesCollection = database.collection(`server_${serverId}_userProfiles`);

            // Find the user's profile
            const userProfile = await profilesCollection.findOne({ userId });

            if (userProfile) {
                // Calculate the portfolio value based on card amounts and Cardmarket's 30-day average prices
                const cardCollection = database.collection('Cards');
                const totalValueEUR = await calculatePortfolioValue(userProfile.cards, cardCollection);

                // Calculate total amount of all cards
                let totalAmount = userProfile.cards.reduce((total, card) => total + card.amount, 0);

                // Create an embed using EmbedBuilder
                const embed = new EmbedBuilder()
                    .setTitle(`Showing info for \`${member.displayName}\``)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                    .setAuthor({
                        name: interaction.user.tag,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                    })
                    .addFields([
                        { name: 'Number of Cards:', value: `\`${totalAmount.toString()}\``, inline: true },
                        {
                            name: 'Portfolio Value',
                            value: `\`${totalValueEUR.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}\``,
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

async function calculatePortfolioValue(cards, cardCollection) {
    let totalValueEUR = 0;

    // Calculate the portfolio value based on card amounts and Cardmarket's 30-day average prices
    for (const card of cards) {
        const cardInfo = await cardCollection.findOne({ id: card.id });
        if (cardInfo && cardInfo.cardmarket && cardInfo.cardmarket.prices && cardInfo.cardmarket.prices.avg30) {
            totalValueEUR += card.amount * cardInfo.cardmarket.prices.avg30;
        }
    }

    return totalValueEUR;
}
