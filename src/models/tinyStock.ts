export interface Tiny_Stock {
    versao:      string;
    cnpj:        string;
    tipo:        string;
    idEcommerce: number;
    dados:       Tiny_Stock_Dados;
}

export interface Tiny_Stock_Dados {
    tipoEstoque:      string;
    saldo:            number;
    idProduto:        string;
    sku:              string;
    skuMapeamento:    string;
    skuMapeamentoPai: string;
}
