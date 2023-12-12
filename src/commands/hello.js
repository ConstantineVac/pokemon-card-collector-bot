// commands/hello.js
module.exports = {
   
        name: 'hello',
        description: 'Say hello!',
   
    async execute(interaction) {
        try {
            await interaction.reply('Hello! I am alive!');
        } catch (error) {
            console.error('Error in /hello command:', error);
            interaction.reply('An error occurred while processing the command.');
        }
    },
};
