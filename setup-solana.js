import { Keypair, Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, transfer, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import 'dotenv/config';

(async () => {
    try {
        console.log("🚀 [DEBUG] Iniciando diagnóstico de rede e abastecimento...");
        
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // 1. Validação da Secret Key
        if (!process.env.SOLANA_TREASURY_SECRET) throw new Error("Chave secreta ausente no .env");
        const secretKey = Uint8Array.from(JSON.parse(process.env.SOLANA_TREASURY_SECRET));
        const treasury = Keypair.fromSecretKey(secretKey);
        
        // 2. Validação do Mint (Limpando possíveis espaços)
        const mintStr = process.env.SOLANA_VFOOD_MINT?.trim();
        if (!mintStr) throw new Error("Mint Address ausente no .env");
        const mint = new PublicKey(mintStr);

        console.log(`- Tesouraria: ${treasury.publicKey.toBase58()}`);
        console.log(`- Token Mint: ${mint.toBase58()}`);

        // 3. AUTO-DETECT: Verifica qual programa gerencia este Token na rede
        console.log("🔍 Detectando tipo do token na Blockchain...");
        const accountInfo = await connection.getAccountInfo(mint);
        
        if (!accountInfo) {
            throw new Error(`O endereço ${mintStr} não existe na Devnet. Certifique-se de que salvou o .env corretamente.`);
        }
        
        const programId = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        console.log(`✅ Tipo Detectado: ${programId.equals(TOKEN_2022_PROGRAM_ID) ? 'Moderno (2022)' : 'Padrão'}`);

        // 4. Criar/Buscar Cofre da Tesouraria
        console.log("📦 Abrindo cofre da Tesouraria...");
        const treasuryATA = await getOrCreateAssociatedTokenAccount(
            connection, treasury, mint, treasury.publicKey, undefined, 'confirmed', undefined, programId
        );

        // 5. Mintar tokens para a Tesouraria
        console.log("🖨️  Abastecendo Tesouraria...");
        await mintTo(
            connection, treasury, mint, treasuryATA.address, treasury.publicKey, 1000000 * 100, [], undefined, programId
        );

        // 6. Enviar para a sua Phantom
        const myPhantomWallet = new PublicKey("7cPFaLtQ3H2GRr1wHaoGeG9hhDDgPWBQGqJ6aXe5Ghsk");
        console.log(`💸 Enviando 1.000 $VFOOD para sua Phantom...`);
        const destinationATA = await getOrCreateAssociatedTokenAccount(
            connection, treasury, mint, myPhantomWallet, undefined, 'confirmed', undefined, programId
        );

        const signature = await transfer(
            connection, treasury, treasuryATA.address, destinationATA.address, treasury.publicKey, 1000 * 100, [], undefined, programId
        );

        console.log("\n=============================================");
        console.log(" 🎉 SUCESSO TOTAL!");
        console.log(`Hash da Transação: ${signature}`);
        console.log("=============================================\n");
        console.log("Verifique sua Phantom agora!");

    } catch (error) {
        console.error("\n❌ ERRO NO PROCESSO:");
        console.error("Mensagem:", error.message);
        if (error.stack) console.log("\nRastro:", error.stack);
    }
})();