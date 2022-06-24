export interface Tiny_Order_Request {
    pedido: Pedido;
}

export interface Pedido {
    data_pedido:             string;
    data_prevista:           string;
    cliente:                 Cliente;
    endereco_entrega:        Endereco_Entrega;
    itens:                   any;
    marcadores?:             Marcador[];
    parcelas?:               Parcela[];
    nome_transportador:      string;
    forma_pagamento?:        string;
    frete_por_conta?:        string;
    valor_frete:             number;
    valor_desconto:          number;
    numero_ordem_compra?:     string;
    numero_pedido_ecommerce?: string;
    situacao:                 string;
    obs?:                    string;
    forma_envio?:            string;
    forma_frete:             string;
}

export interface Item {
    item: Item_Elemento;
}

export interface Item_Elemento {
    id?:            number;
    codigo?:        string;
    descricao:      string;
    unidade:        string;
    quantidade:     number;
    valor_unitario: number;
}

export interface Cliente {
    codigo?: string
    nome: string,
    nome_fantasia?: string,
    tipo_pessoa?: 'F' | 'J' | 'E',
    cpf_cnpj: string,
    ie?: string,
    rg?: string,
    endereco?: string,
    numero?: string,
    complemento?: string,
    bairro?: string,
    cep?: string,
    cidade?: string,
    uf?: string,
    fone?: string
    pais?: string,
    email?: string,
    atualizar_cliente?: 'S' | 'N'
}

export interface Endereco_Entrega {
    tipo_pessoa?: 'F' | 'J' | 'E',
    cpf_cnpj?: string,
    endereco: string,
    numero: string,
    complemento?: string,
    bairro: string,
    cep: string,
    cidade: string,
    uf: string,
    fone?: string,
    nome_destinatario?: string,
    ie?: string
}

export interface Marcador {
    marcador: Marcador_Elemento;
}

export interface Marcador_Elemento {
    descricao?: string;
    id?:        string;
}

export interface Parcela {
    parcela: Parcela_Elemento;
}

export interface Parcela_Elemento {
    dias:             string;
    data:             string;
    valor:            string;
    obs:              string;
    forma_pagamento?: string;
    meio_pagamento?:  string;
}


export interface Tiny_Order_Response {
    retorno: Retorno;
}

export interface Retorno {
    status_processamento: number;
    status:               string;
    registros:            Registro[];
}

export interface Registro {
    registro: Registro_Element;
}

export interface Registro_Element {
    sequencia:   string;
    status:      string;
    codigo_erro: string;
    erros:       Erro[];
}

export interface Erro {
    erro: string;
}

export const ORDER_STATUS_HUB2B_TINY = {
    Pending: 'aberto',
    Approved: 'aprovado',
    Invoiced: 'faturado',
    Shipped: 'enviado',
    Delivered: 'entregue',
    Canceled: 'cancelado',
    Completed: 'entregue'
}

export const ORDER_STATUS_TINY_HUB2B = {
    aberto: 'Pending',
    aprovado: 'Approved',
    faturado: 'Invoiced',
    enviado: 'Shipped',
    entregue: 'Delivered',
    cancelado: 'Canceled'
}
