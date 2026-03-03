import React from 'react';
import { useStore } from '../context/StoreContext'; 

export default function Policies() {
    // Agora usamos o seu hook correto e puxamos a variável "store"
    const { store } = useStore();
    
    const storeName = store?.name || "nossa loja";
    const storeEmail = store?.ownerEmail || "contato@velodelivery.com.br";
    const storePhone = store?.whatsapp || "nosso WhatsApp";

    return (
        <div className="max-w-4xl mx-auto p-6 text-gray-800 leading-relaxed">
            <h1 className="text-3xl font-bold mb-8 border-b pb-4">Políticas e Termos - {storeName}</h1>

            {/* SESSÃO 1: TROCAS E DEVOLUÇÕES (Foco Google Merchant) */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Política de Trocas, Devoluções e Reembolso</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Condições de Devolução:</strong> Por se tratar de produtos perecíveis e de consumo imediato (alimentos e bebidas), aceitamos devoluções apenas no ato da entrega caso o pedido esteja incorreto, danificado ou fora do padrão de qualidade.</li>
                    <li><strong>Como solicitar:</strong> O cliente deve recusar o recebimento com o entregador ou entrar em contato imediatamente pelo telefone/WhatsApp <strong>{storePhone}</strong> enviando uma foto do produto recebido.</li>
                    <li><strong>Prazos:</strong> Reclamações sobre qualidade ou itens faltantes devem ser feitas no prazo máximo de <strong>2 horas</strong> após o recebimento.</li>
                    <li><strong>Reembolso:</strong> Caso a devolução seja aprovada, o reembolso será processado no mesmo método de pagamento utilizado na compra (PIX, Cartão) ou em formato de crédito na loja, em até 2 dias úteis.</li>
                </ul>
            </section>

            {/* SESSÃO 2: FRETE E ENTREGAS (Foco Google Merchant) */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Política de Entrega e Frete</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Locais atendidos e Prazos:</strong> O tempo estimado de entrega e a taxa de frete são calculados automaticamente no carrinho, baseados no CEP ou endereço fornecido no momento da compra.</li>
                    <li><strong>Horário de Operação:</strong> As entregas são realizadas exclusivamente dentro do nosso horário de funcionamento, disponível na página inicial do aplicativo.</li>
                    <li><strong>Tentativas de Entrega:</strong> Caso o entregador não consiga contato com o cliente no endereço informado após 10 minutos de espera, o pedido retornará para a loja e poderá ser cobrada uma nova taxa de deslocamento.</li>
                </ul>
            </section>

            {/* SESSÃO 3: PRIVACIDADE (Foco LGPD) */}
            <section className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Política de Privacidade (LGPD)</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Coleta de Dados:</strong> Coletamos apenas os dados essenciais para o processamento e entrega do seu pedido (Nome, Endereço, Telefone).</li>
                    <li><strong>Uso das Informações:</strong> Seus dados não são vendidos ou compartilhados com terceiros. Eles são utilizados estritamente pelo ecossistema do Velo Delivery e pela <strong>{storeName}</strong> para garantir que o produto chegue até você e para envio de atualizações do status do pedido.</li>
                    <li><strong>Segurança:</strong> Utilizamos criptografia e os mais altos padrões de segurança em nossos servidores para proteger suas informações pessoais.</li>
                    <li><strong>Contato DPO:</strong> Para solicitar a exclusão dos seus dados, entre em contato via e-mail: <strong>{storeEmail}</strong>.</li>
                </ul>
            </section>
        </div>
    );
}