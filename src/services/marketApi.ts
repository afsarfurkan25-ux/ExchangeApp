export const getCurrencyRates = async () => {
    const res = await fetch("http://localhost:5000/api/currency")
    return res.json()
}

export const getGoldRates = async () => {
    const res = await fetch("http://localhost:5000/api/gold")
    return res.json()
}

export const getSilverRates = async () => {
    const res = await fetch("http://localhost:5000/api/silver")
    return res.json()
}
