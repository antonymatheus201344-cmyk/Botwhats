const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require("@whiskeysockets/baileys")

const cron = require("node-cron")
const P = require("pino")

const NUMERO = process.env.NUMERO
const GRUPO_ID = process.env.GRUPO_ID
const HORARIO = process.env.HORARIO || "0 8 * * *"

async function iniciarBot() {

    const { state, saveCreds } = await useMultiFileAuthState("auth")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        auth: state,
        browser: ["BotCampo", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    if (!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode(NUMERO)
        console.log("🔐 Código de pareamento:", code)
    }

    sock.ev.on("connection.update", async (update) => {

        const { connection, lastDisconnect } = update

        if (connection === "close") {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                iniciarBot()
            }
        }

        if (connection === "open") {
            console.log("✅ Bot conectado!")

            cron.schedule(HORARIO, async () => {

                await sock.sendMessage(GRUPO_ID, {
                    text: "🤖 *BOT DE PRESENÇA*\nEnquete automática diária."
                })

                await sock.sendMessage(GRUPO_ID, {
                    poll: {
                        name: "⚽ Quem vai para o campo?",
                        values: ["✅ Sim", "🤔 Talvez", "❌ Não"],
                        selectableCount: 1
                    }
                })

                console.log("📤 Enquete enviada!")
            })
        }
    })
}

iniciarBot()
