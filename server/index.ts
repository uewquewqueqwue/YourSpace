import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import appRoutes from './routes/apps'
import userRoutes from './routes/user'
import versionRoutes from "./routes/version"

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api', authRoutes)
app.use('/api', appRoutes)
app.use('/api', userRoutes)
app.use('/api', versionRoutes)

app.listen(PORT, () => {
  console.log("info",`API server running on http://localhost:${PORT}`)
})