import axios, { Method } from "axios"
import { log } from "../utils/loggerUtil"
import { getFunctionName, logAxiosError } from "../utils/util"

export const requestTiny = async (url: string, method: Method, token: string, body?: any): Promise<any> => {

    try {

        const response = await axios({
            method: method,
            url: url,
            data: body,
            params: {
                token: token,
                formato: 'json',
            }
        })

        response
            ? log("Request Success", "EVENT", getFunctionName(3))
            : log("Request Failed", "EVENT", getFunctionName(3), "WARN")

        return response

    } catch (error) {

        if (axios.isAxiosError(error)) {
            log(error.response?.data?.errors, "EVENT", getFunctionName(), "ERROR")
            logAxiosError(error)
        }

        if (error instanceof Error) {
            log(error.message, "EVENT", getFunctionName(3), "ERROR")
        }

        if (axios.isAxiosError(error)) {
            error.response?.data?.error &&
                log(error.response?.data?.error, "EVENT", getFunctionName(3), "ERROR")
            error.response?.data?.error_description &&
                log(error.response?.data?.error_description, "EVENT", getFunctionName(3), "ERROR")
            error.response?.data?.message &&
                log(error.response?.data?.message, "EVENT", getFunctionName(3), "ERROR")
            error.response?.data?.errors &&
                log(error.response?.data?.errors, "EVENT", getFunctionName(3), "ERROR")
        }

        return null
    }
}

export const getTinyInfo = async (token: string) => {

    const response = await requestTiny('https://api.tiny.com.br/api2/info.php', 'post', token)

    if (!response) return null

    return response.data
}
