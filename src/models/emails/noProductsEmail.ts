
import { FRONT_END_URL } from "../../utils/consts"

export const noProductsEmailContent = () => /*html*/`
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="telephone=no" name="format-detection">
    <title></title>
    <!--[if (mso 16)]>
    <style type="text/css">
    a {text-decoration: none;}
    </style>
    <![endif]-->
    <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
    <!--[if gte mso 9]>
<xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG></o:AllowPNG>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
</xml>
<![endif]-->
</head>

<body>
    <div class="es-wrapper-color">
        <!--[if gte mso 9]>
			<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
				<v:fill type="tile" color="#f8f9fd"></v:fill>
			</v:background>
		<![endif]-->
        <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0">
            <tbody>
                <tr>
                    <td class="esd-email-paddings" valign="top">
                        <table cellpadding="0" cellspacing="0" class="es-content esd-header-popover" align="center">
                            <tbody>
                                <tr>
                                    <td class="esd-stripe" align="center" bgcolor="#f8f9fd" style="background-color: #f8f9fd;">
                                        <table bgcolor="#ffffff" class="es-content-body" align="center" cellpadding="0" cellspacing="0" width="600">
                                            <tbody>
                                                <tr>
                                                    <td class="esd-structure es-p10t es-p15b es-p30r es-p30l" align="left">
                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                            <tbody>
                                                                <tr>
                                                                    <td width="540" class="esd-container-frame" align="center" valign="top">
                                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td align="center" class="esd-block-image" style="font-size: 0px;"><a target="_blank"><img class="adapt-img" src="https://raw.githubusercontent.com/Cleberw3b/seller-center/main/src/assets/mail/mail-header.png" alt style="display: block;" width="600"></a></td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <table cellpadding="0" cellspacing="0" class="es-content esd-footer-popover" align="center">
                            <tbody>
                                <tr>
                                    <td class="esd-stripe" align="center" bgcolor="#f8f9fd" style="background-color: #f8f9fd;">
                                        <table bgcolor="transparent" class="es-content-body" align="center" cellpadding="0" cellspacing="0" width="600" style="background-color: transparent;">
                                            <tbody>
                                                <tr>
                                                    <td class="esd-structure es-p20t es-p10b es-p20r es-p20l" align="left">
                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                            <tbody>
                                                                <tr>
                                                                    <td width="560" class="esd-container-frame" align="center" valign="top">
                                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td align="center" class="esd-block-text es-p10t es-p10b">
                                                                                        <h3>Olá! Tudo bem?</h3>
                                                                                        <p>Faz mais de uma semana que você se cadastrou no Seller Center, mas ainda não encontramos nenhum produto para enviar aos canais vendas e multiplicar seus resultados!</p>

                                                                                        <p>Precisa de ajuda?</p>

                                                                                        <p>Clique <a href="${FRONT_END_URL}">aqui</a> e cadastre seu <strong>primeiro produto</strong> na plataforma. Se encontrar dificuldades, entre em contato com o nosso suporte em <strong>{forma de suporte}</strong> que iremos te ajudar.</p>
                                                                                    </td>
                                                                                </tr>
                                                                                <tr>
                                                                                    <td align="center" class="esd-block-text es-p10b">
                                                                                        <h3>Obrigado e até a próxima venda!</h3>
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td class="esd-structure es-p15t es-m-p15t es-m-p0b es-m-p0r es-m-p0l" align="left">
                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                            <tbody>
                                                                <tr>
                                                                    <td width="600" class="esd-container-frame" align="center" valign="top">
                                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td align="center" class="esd-block-image" style="font-size: 0px;"><a target="_blank"><img class="adapt-img" src="https://raw.githubusercontent.com/Cleberw3b/seller-center/main/src/assets/mail/mail-footer.png" alt style="display: block;" width="600"></a></td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</body>

</html>
`