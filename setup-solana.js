import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';

(async () => {
    try {
        console.log("1. Gerando a Carteira da Tesouraria Velo...");
        const treasury = Keypair.generate();
        const secretKeyString = `[${treasury.secretKey.toString()}]`;
        
        console.log(`\n=============================================`);
        console.log(` SALVE SUA CHAVE (Caso a rede caia de novo)`);
        console.log(` SOLANA_TREASURY_SECRET=${secretKeyString}`);
        console.log(`=============================================\n`);
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        console.log(`Chave Pública: ${treasury.publicKey.toBase58()}`);
        console.log("2. Solicitando SOL na Devnet... (Pode demorar uns segundos)");
        
        const airdropSignature = await connection.requestAirdrop(treasury.publicKey, LAMPORTS_PER_SOL);
        await connection.confirmTransaction(airdropSignature);
        console.log(" SOL recebido com sucesso!");

        console.log("3. Criando o contrato do Token $VFOOD...");
        const mint = await createMint(connection, treasury, treasury.publicKey, null, 2);

        console.log("\n=============================================");
        console.log(" SUCESSO! COPIE PARA O SEU .env");
        console.log("=============================================\n");
        console.log(`SOLANA_TREASURY_SECRET=${secretKeyString}`);
        console.log(`SOLANA_VFOOD_MINT=${mint.toBase58()}`);
        console.log("\n=============================================");
        
    } catch (error) {
        console.error("\n Erro na rede Solana:", error.message);
        console.log(" Se o Airdrop falhou novamente, acesse https://faucet.solana.com, cole sua 'Chave Pública' lá e pegue 1 SOL manualmente. Depois, avise-me aqui!");
    }
})();