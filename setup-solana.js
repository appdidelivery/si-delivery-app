import { Keypair, Connection, clusterApiUrl, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { 
    getAssociatedTokenAddressSync, 
    createAssociatedTokenAccountInstruction, 
    createMintToInstruction, 
    TOKEN_2022_PROGRAM_ID, 
    TOKEN_PROGRAM_ID,
    getAccount
} from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        const mint = new PublicKey(process.env.SOLANA_VFOOD_MINT);

        console.log(`\n🚀 INICIANDO ABASTECIMENTO VFOOD (MODO HÍBRIDO)`);
        
        // 1. Descobrir qual programa manda no seu Token (Standard ou 2022)
        const mintInfo = await connection.getAccountInfo(mint);
        const programId = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        
        console.log(`PADRÃO: ${programId.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022 (Moderno)' : 'Token-Standard (Antigo)'}`);
        console.log(`Mint: ${mint.toBase58()}`);

        // 2. Calcular endereço do cofre (ATA) respeitando o Programa correto
        const ata = getAssociatedTokenAddressSync(mint, treasury.publicKey, false, programId);
        console.log(`Cofre (ATA): ${ata.toBase58()}`);

        const transaction = new Transaction();

        // 3. Verificar se o cofre já existe
        try {
            await getAccount(connection, ata, 'confirmed', programId);
            console.log("✅ Cofre já existe.");
        } catch (e) {
            console.log("📦 Criando cofre compatível...");
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    treasury.publicKey,
                    ata,
                    treasury.publicKey,
                    mint,
                    programId
                )
            );
        }

        // 4. Imprimir 1.000.000 tokens
        console.log("🖨️  Preparando impressão de 1.000.000 $VFOOD...");
        transaction.add(
            createMintToInstruction(mint, ata, treasury.publicKey, 1000000 * 100, [], programId)
        );

        console.log("⏳ Enviando para a rede...");
        const signature = await sendAndConfirmTransaction(connection, transaction, [treasury]);

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO! TOKENS GERADOS COM SUCESSO");
        console.log("=============================================");
        console.log(`Hash: ${signature}`);
        console.log(`Novo Saldo: 1.000.000 $VFOOD`);
        console.log("=============================================\n");

    } catch (error) {
        console.error("\n❌ ERRO NA OPERAÇÃO:");
        console.error("---------------------------------------------");
        console.error(error.message);
        console.log("\nDICA: Se o erro persistir, a rede pode estar instável. Tente novamente em 10 segundos.");
    }
})();