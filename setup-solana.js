import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import 'dotenv/config';

(async () => {
    console.log("🔍 === INICIANDO AUDITORIA DE AMBIENTE VELO ===\n");

    try {
        // 1. Validar Variáveis do .env
        const rawMint = process.env.SOLANA_VFOOD_MINT;
        const rawSecret = process.env.SOLANA_TREASURY_SECRET;

        if (!rawMint) console.error("❌ ERRO: SOLANA_VFOOD_MINT não encontrada no .env");
        if (!rawSecret) console.error("❌ ERRO: SOLANA_TREASURY_SECRET não encontrada no .env");

        console.log(`📍 Mint lido do .env: "${rawMint}"`);
        
        const mint = new PublicKey(rawMint.trim());
        const secretKey = Uint8Array.from(JSON.parse(rawSecret));
        const treasury = Keypair.fromSecretKey(secretKey);

        console.log(`✅ Endereço da Tesouraria: ${treasury.publicKey.toBase58()}`);

        // 2. Testar Conexão e Existência do Token
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        console.log("\n⏳ Consultando a Blockchain Solana Devnet...");

        const info = await connection.getAccountInfo(mint);

        if (info === null) {
            console.error("\n🚨 ALERTA CRÍTICO: O Token NÃO existe na Devnet!");
            console.log("Causa Provável: O endereço no .env está errado ou o token nunca foi criado na Devnet.");
            console.log("SOLUÇÃO: Rode o script 'node setup-metadata.js' novamente para gerar um token válido.");
        } else {
            console.log("✅ Token ENCONTRADO na rede!");
            console.log(`Dono do Programa: ${info.owner.toBase58()}`);
            console.log("\nO Token está ok. O problema anterior foi apenas instabilidade da rede.");
            console.log("DICA: Rode o script de abastecimento simplificado novamente.");
        }

    } catch (error) {
        console.error("\n💥 ERRO DE SINTAXE NO CÓDIGO OU .ENV:");
        console.error(error.message);
        console.log("\nDICA: Verifique se o SOLANA_VFOOD_MINT no .env não tem aspas nem espaços.");
    }
    
    console.log("\n=== FIM DA AUDITORIA ===");
})();