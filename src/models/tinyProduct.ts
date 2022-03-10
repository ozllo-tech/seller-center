export interface Tiny_Product {
    versao: string;
    cnpj: string;
    idEcommerce: number;
    tipo: string;
    dados: Tiny_Product_Dados;
}

export interface Tiny_Product_Dados {
    id:                       string;
    idMapeamento:             string;
    skuMapeamento:            string;
    nome:                     string;
    codigo:                   string;
    unidade:                  string;
    preco:                    string;
    precoPromocional:         string;
    ncm:                      string;
    origem:                   string;
    gtin:                     string;
    gtinEmbalagem:            string;
    localizacao:              string;
    pesoLiquido:              string;
    pesoBruto:                string;
    estoqueMinimo:            string;
    estoqueMaximo:            string;
    idFornecedor:             string;
    codigoFornecedor:         string;
    codigoPeloFornecedor:     string;
    unidadePorCaixa:          string;
    estoqueAtual:             number;
    precoCusto:               string;
    precoCustoMedio:          string;
    situacao:                 string;
    descricaoComplementar:    string;
    obs:                      string;
    garantia:                 string;
    cest:                     string;
    sobEncomenda:             string;
    marca:                    string;
    tipoEmbalagem:            string;
    alturaEmbalagem:          string;
    larguraEmbalagem:         string;
    comprimentoEmbalagem:     string;
    diametroEmbalagem:        string;
    classeProduto:            string;
    idCategoria:              string;
    descricaoCategoria:       string;
    descricaoArvoreCategoria: string;
    arvoreCategoria:          ArvoreCategoria[];
    variacoes:                Tiny_Variacoes[];
    anexos:                   Anexo[];
    seo:                      SEO;
    kit:                      Kit[];
}

interface Anexo {
    url:  string;
    nome: string;
    tipo: string;
}

interface ArvoreCategoria {
    id:                string;
    idPai:             number | string;
    descricao:         string;
    descricaoCompleta: string;
}

interface Kit {
    id:         number;
    quantidade: number;
}

export interface SEO {
    title:       string;
    description: string;
    keywords:    string;
    linkVideo:   string;
    slug:        string;
}

export interface Tiny_Variacoes {
    id:               string;
    idMapeamento:     string;
    skuMapeamento:    string;
    codigo:           string;
    gtin:             string;
    preco:            string;
    precoPromocional: string;
    estoqueAtual:     number;
    grade:            Grade[];
    anexos:           any[];
}

interface Grade {
    chave: string;
    valor: string;
}

export interface Tiny_Product_Map {
    idMapeamento:  string;
    skuMapeamento: string;
    error?:        string;
}
