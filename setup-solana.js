import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, transfer, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { createMint } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        console.log("🛠️ [Velo Repair] Iniciando reconstrução do ecossistema...");
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);

        console.log("1. Criando NOVO contrato VFOOD (Token-2022)...");
        const mint = await createMint(
            connection,
            treasury,
            treasury.publicKey,
            null,
            2,
            undefined,
            undefined,
            TOKEN_2022_PROGRAM_ID
        );
        const mintAddr = mint.toBase58();
        console.log(`✅ NOVO MINT GERADO: ${mintAddr}`);

        console.log("2. Abrindo cofre da Tesouraria...");
        const treasuryATA = await getOrCreateAssociatedTokenAccount(
            connection, treasury, mint, treasury.publicKey, undefined, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID
        );

        console.log("3. Imprimindo 1.000.000 $VFOOD...");
        await mintTo(
            connection, treasury, mint, treasuryATA.address, treasury.publicKey, 1000000 * 100, [], undefined, TOKEN_2022_PROGRAM_ID
        );

        console.log("4. Enviando 5.000 $VFOOD para sua Phantom...");
        const myPhantom = new PublicKey("7cPFaLtQ3H2GRr1wHaoGeG9hhDDgPWBQGqJ6aXe5Ghsk");
        const destATA = await getOrCreateAssociatedTokenAccount(
            connection, treasury, mint, myPhantom, undefined, 'confirmed', undefined, TOKEN_2022_PROGRAM_ID
        );
        
        await transfer(
            connection, treasury, treasuryATA.address, destATA.address, treasury.publicKey, 5000 * 100, [], undefined, TOKEN_2022_PROGRAM_ID
        );

        console.log("\n=============================================");
        console.log(" 🔥 SUCESSO ABSOLUTO! TUDO REPARADO");
        console.log("=============================================");
        console.log("COPIE E SUBSTITUA NO SEU .env (E TAMBÉM NO .env.local se existir):");
        console.log(`SOLANA_VFOOD_MINT=${mintAddr}`);
        console.log("=============================================\n");
        console.log("Verifique sua Phantom agora, o saldo de 5.000 já deve estar lá!");

    } catch (error) {
        console.error("\n❌ Erro Fatal:", error.message);
    }
})();