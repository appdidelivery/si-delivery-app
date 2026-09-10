import { Keypair, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import 'dotenv/config'; // Garante que ele consiga ler o seu .env

(async () => {
    try {
        let treasury;

        // Tenta carregar a chave do .env se ela já existir
        if (process.env.SOLANA_TREASURY_SECRET) {
            console.log("🔍 [1] Usando Chave da Tesouraria existente no .env...");
            const secretKeyArray = JSON.parse(process.env.SOLANA_TREASURY_SECRET);
            treasury = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
        } else {
            console.log("🆕 [1] Gerando NOVA Chave da Tesouraria Velo...");
            treasury = Keypair.generate();
        }

        const publicKey = treasury.publicKey.toBase58();
        const secretKeyString = `[${treasury.secretKey.toString()}]`;

        console.log(`\n✅ CARTEIRA DA TESOURARIA PRONTA:`);
        console.log(`---------------------------------------------`);
        console.log(`CHAVE PÚBLICA (Endereço): ${publicKey}`);
        console.log(`SOLANA_TREASURY_SECRET=${secretKeyString}`);
        console.log(`---------------------------------------------\n`);

        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const balance = await connection.getBalance(treasury.publicKey);

        console.log(`💰 Saldo Atual: ${balance / LAMPORTS_PER_SOL} SOL`);

        if (balance < 0.1 * LAMPORTS_PER_SOL) {
            console.log("\n⚠️ SALDO INSUFICIENTE PARA CRIAR A MOEDA.");
            console.log("Siga estas etapas:");
            console.log(`1. Copie a 'SOLANA_TREASURY_SECRET' acima e cole no seu arquivo .env`);
            console.log(`2. Acesse: https://faucet.solana.com`);
            console.log(`3. Cole o endereço: ${publicKey}`);
            console.log(`4. Solicite 1 SOL e, após receber, rode este script novamente.`);
            return; // PARA O SCRIPT AQUI
        }

        console.log("\n🚀 [2] Saldo detectado! Criando contrato do Token $VFOOD...");
        const mint = await createMint(connection, treasury, treasury.publicKey, null, 2);

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO! TOKEN $VFOOD CRIADO ON-CHAIN");
        console.log("=============================================\n");
        console.log(`SOLANA_VFOOD_MINT=${mint.toBase58()}`);
        console.log("\nAtualize seu .env com o endereço do contrato acima.");
        
    } catch (error) {
        console.error("\n❌ Erro no Setup:", error.message);
        if (error.message.includes("Unexpected token")) {
            console.log("DICA: Verifique se você colou a SOLANA_TREASURY_SECRET corretamente no .env (deve ser um array [0,1,2...])");
        }
    }
})();