import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import 'dotenv/config';

(async () => {
    try {
        console.log("1. Conectando à Solana Devnet...");
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Puxa as chaves geradas anteriormente do seu .env
        const secretKeyArray = JSON.parse(process.env.SOLANA_TREASURY_SECRET);
        const treasury = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));
        const mintAddress = new PublicKey(process.env.SOLANA_VFOOD_MINT);

        console.log("2. Inicializando Metaplex com a Tesouraria...");
        const metaplex = Metaplex.make(connection).use(keypairIdentity(treasury));

        console.log("3. Injetando Metadados no Contrato $VFOOD...");
        
        // Substitua esta URL pelo link público do seu arquivo JSON (instruções abaixo)
        const tokenMetadataUri = "https://velodelivery.com.br/vfood-metadata.json";

       await metaplex.nfts().create({
            useExistingMint: mintAddress,
            name: "Velo Food",
            symbol: "VFOOD",
            uri: tokenMetadataUri,
            sellerFeeBasisPoints: 0, 
            isMutable: true, 
            tokenStandard: 2, // <-- A MÁGICA AQUI: Informa a rede que é uma moeda fungível (permite decimais)
        });

        console.log("\n=============================================");
        console.log(" SUCESSO! IDENTIDADE VISUAL INJETADA.");
        console.log(` Abra na Phantom ou veja na Explorer: https://explorer.solana.com/address/${mintAddress.toBase58()}?cluster=devnet`);
        console.log("=============================================\n");

    } catch (error) {
        console.error("\nErro Crítico na injeção:", error.message);
    }
})();