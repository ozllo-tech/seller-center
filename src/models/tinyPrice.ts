export interface Tiny_Price {
    versao:      string;
    cnpj:        string;
    idEcommerce: number;
    tipo:        string;
    dados:       Tiny_Price_Dados;
}

export interface Tiny_Price_Dados {
    idMapeamento:     string;
    skuMapeamento:    string;
    skuMapeamentoPai: string;
    nome:             string;
    codigo:           string;
    preco:            string;
    precoPromocional: string;
}
