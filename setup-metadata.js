import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import 'dotenv/config';

(async () => {
    try {
        console.log("1. Conectando à Solana Devnet...");
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        const secretKeyArray = JSON.parse(process.env.SOLANA_TREASURY_SECRET);
        const treasury = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));

        console.log("2. Gerando o contrato definitivo ($VFOOD) com 2 casas decimais...");
        const mint = await createMint(connection, treasury, treasury.publicKey, null, 2);
        console.log(` -> Novo Mint gerado: ${mint.toBase58()}`);

        console.log("3. Injetando a Identidade Visual (Fungible Token)...");
        const metaplex = Metaplex.make(connection).use(keypairIdentity(treasury));
        
        const tokenMetadataUri = "https://app.velodelivery.com.br/vfood-metadata.json";

        // A MÁGICA AQUI: Trocamos 'create()' por 'createSft()'
        await metaplex.nfts().createSft({
            useExistingMint: mint,
            name: "Velo Food",
            symbol: "VFOOD",
            uri: tokenMetadataUri,
            sellerFeeBasisPoints: 0,
            isMutable: true,
            tokenStandard: 2, 
        });

        console.log("\n=============================================");
        console.log(" SUCESSO ABSOLUTO! O TOKEN GANHOU VIDA.");
        console.log("=============================================\n");
        console.log(" PASSO FINAL: Substitua a variável no seu .env pela nova abaixo:");
        console.log(`SOLANA_VFOOD_MINT=${mint.toBase58()}`);
        console.log("\n=============================================");

    } catch (error) {
        console.error("\nErro Crítico na injeção:", error.message || error);
    }
})();