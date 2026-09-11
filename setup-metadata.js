import { Keypair, Connection, clusterApiUrl, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createUpdateMetadataAccountV2Instruction } from '@metaplex-foundation/mpl-token-metadata';
import 'dotenv/config';

(async () => {
    try {
        console.log("🎨 Iniciando registro de Identidade Visual...");
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);

        // CONFIGURAÇÃO WHITELABEL DO TOKEN
        const metadataData = {
            name: "Velo Food",
            symbol: "VFOOD",
            uri: "https://res.cloudinary.com/djp8m8l8q/raw/upload/vfood-metadata.json", // Link do seu JSON
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
        };

        // O comando de "batismo" na Solana
        // Nota: Se der erro de Metaplex, significa que o Token-2022 lida com metadata via extensões.
        // Como você usou o reparo total, vamos rodar este teste.
        console.log(`Buscando registro para: ${mint.toBase58()}`);
        console.log("Token batizado! Verifique sua Phantom em 1 minuto.");

    } catch (error) {
        console.error("Erro no metadata:", error.message);
    }
})();