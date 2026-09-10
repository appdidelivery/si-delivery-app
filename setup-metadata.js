import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import 'dotenv/config';

(async () => {
    try {
        console.log("1. Conectando à Solana Devnet...");
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Carrega a Tesouraria que já possui saldo (SOL)
        const secretKeyArray = JSON.parse(process.env.SOLANA_TREASURY_SECRET);
        const treasury = Keypair.fromSecretKey(Uint8Array.from(secretKeyArray));

        console.log("2. Gerando um novo contrato limpo ($VFOOD) com 2 casas decimais...");
        const mint = await createMint(connection, treasury, treasury.publicKey, null, 2);
        console.log(` -> Novo Mint gerado: ${mint.toBase58()}`);

        console.log("3. Injetando a Identidade Visual definitiva...");
        const metaplex = Metaplex.make(connection).use(keypairIdentity(treasury));
        
        // Link do seu JSON público hospedado
        const tokenMetadataUri = "https://app.velodelivery.com.br/vfood-metadata.json";

        await metaplex.nfts().create({
            useExistingMint: mint,
            name: "Velo Food",
            symbol: "VFOOD",
            uri: tokenMetadataUri,
            sellerFeeBasisPoints: 0,
            isMutable: true,
            tokenStandard: 2, // Garante que a rede o reconheça como Moeda Fungível
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