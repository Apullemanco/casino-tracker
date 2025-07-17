"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Plus, Trash2, TrendingUp, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type React from "react"

// Modificar la interfaz SpinRecord para incluir el ID del Croupier
interface SpinRecord {
  number: string | number
  timestamp: number
  croupierId: string // Añadir el ID del Croupier
}

// Añadir una nueva interfaz para el Croupier
interface Croupier {
  id: string
  name: string
  startTime: number
}

// Números de la ruleta americana (0-36 y 00)
const rouletteNumbers = [...Array.from({ length: 37 }, (_, i) => i), "00"]

// Definir colores de la ruleta
const getRouletteColor = (num: string | number): string => {
  if (num === 0 || num === "00") return "green"

  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]
  return redNumbers.includes(Number(num)) ? "red" : "black"
}

const getColorClass = (num: string | number): string => {
  const color = getRouletteColor(num)
  if (color === "red") return "bg-red-700"
  if (color === "black") return "bg-black"
  return "bg-green-700" // green
}

const getTextColorClass = (num: string | number): string => {
  return getRouletteColor(num) === "black" ? "text-white" : "text-white"
}

// Primero, agrega esta función helper para calcular porcentajes después de la función getTextColorClass:

const calculatePercentage = (count: number, total: number): string => {
  if (total === 0) return "0%"
  return `${((count / total) * 100).toFixed(1)}%`
}

// Actualizar la tabla de pagos con el formato original
const payoutTable = [
  { bet: "Pleno (Straight Up)", payout: "35 a 1", example: "Apostar al 17" },
  { bet: "Dividido (Split)", payout: "17 a 1", example: "Apostar a 14-17" },
  { bet: "Calle (Street)", payout: "11 a 1", example: "Apostar a 13-14-15" },
  { bet: "Esquina (Corner)", payout: "8 a 1", example: "Apostar a 8-9-11-12" },
  { bet: "Línea (Six Line)", payout: "5 a 1", example: "Apostar a 31-36" },
  { bet: "Columna (Column)", payout: "2 a 1", example: "Apostar a 1ª columna (1,4,...,34)" },
  { bet: "Docena (Dozen)", payout: "2 a 1", example: "Apostar a 1-12" },
  { bet: "Rojo/Negro (Red/Black)", payout: "1 a 1", example: "Apostar a todos los rojos" },
  { bet: "Par/Impar (Even/Odd)", payout: "1 a 1", example: "Apostar a todos los pares" },
  { bet: "1-18/19-36", payout: "1 a 1", example: "Apostar a números 1-18" },
]

// Modificar el componente principal para incluir el estado de los Croupiers
export default function RoulettePage() {
  const [spins, setSpins] = useState<SpinRecord[]>([])
  const [inputNumber, setInputNumber] = useState("")
  const [hotNumbers, setHotNumbers] = useState<[string | number, number][]>([])
  const [coldNumbers, setColdNumbers] = useState<[string | number, number][]>([])
  const [croupiers, setCroupiers] = useState<Croupier[]>([])
  const [currentCroupierId, setCurrentCroupierId] = useState<string>("")
  const [croupierName, setCroupierName] = useState<string>("")
  const [showCroupierModal, setShowCroupierModal] = useState<boolean>(false)
  const [bestBet, setBestBet] = useState<{
    type: string
    description: string
    odds: string
    potential: number
    confidence: number
  }>({
    type: "Cargando...",
    description: "Analizando datos...",
    odds: "-",
    potential: 0,
    confidence: 0,
  })

  // Añadir después de las declaraciones de estado existentes
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 24 // Número de giros por página

  useEffect(() => {
    // Cargar datos guardados al iniciar
    const savedSpins = localStorage.getItem("rouletteSpins")
    const savedCroupiers = localStorage.getItem("rouletteCroupiers")
    const savedCurrentCroupierId = localStorage.getItem("currentCroupierId")

    if (savedSpins) {
      setSpins(JSON.parse(savedSpins))
    }

    if (savedCroupiers) {
      setCroupiers(JSON.parse(savedCroupiers))
    } else {
      // Si no hay croupiers guardados, crear uno por defecto
      const defaultCroupier: Croupier = {
        id: "default-" + Date.now(),
        name: "Croupier Inicial",
        startTime: Date.now(),
      }
      setCroupiers([defaultCroupier])
      localStorage.setItem("rouletteCroupiers", JSON.stringify([defaultCroupier]))
      setCurrentCroupierId(defaultCroupier.id)
      localStorage.setItem("currentCroupierId", defaultCroupier.id)
    }

    if (savedCurrentCroupierId) {
      setCurrentCroupierId(savedCurrentCroupierId)
    }
  }, [])

  // Modificar la función useEffect para calcular con los últimos 10 giros y filtrar por Croupier actual
  useEffect(() => {
    // Guardar datos cuando cambian
    if (spins.length > 0) {
      localStorage.setItem("rouletteSpins", JSON.stringify(spins))
    }

    if (croupiers.length > 0) {
      localStorage.setItem("rouletteCroupiers", JSON.stringify(croupiers))
    }

    if (currentCroupierId) {
      localStorage.setItem("currentCroupierId", currentCroupierId)
    }

    // Filtrar los giros del Croupier actual
    const currentCroupierSpins = spins.filter((spin) => spin.croupierId === currentCroupierId)

    // Calcular números calientes y fríos basados en los últimos 10 giros del Croupier actual
    const calculateHotColdNumbers = () => {
      // Obtener solo los últimos 200 giros del Croupier actual (o menos si no hay suficientes)
      const recentSpins = currentCroupierSpins.slice(0, Math.min(200, currentCroupierSpins.length))

      // Contar frecuencia de cada número
      const frequency: Record<string, number> = {}

      // Inicializar todos los números posibles con 0
      rouletteNumbers.forEach((num) => {
        frequency[num.toString()] = 0
      })

      // Contar apariciones en los últimos 200 giros
      recentSpins.forEach((spin) => {
        frequency[spin.number.toString()] = (frequency[spin.number.toString()] || 0) + 1
      })

      // Convertir a array para ordenar
      const frequencyArray: [string | number, number][] = Object.entries(frequency).map(([num, count]) => [
        num === "00" ? "00" : Number(num),
        count,
      ])

      // Filtrar 0 y 00 para los números calientes
      const filteredForHot = frequencyArray.filter((item) => item[0] !== 0 && item[0] !== "00")

      // Ordenar por frecuencia (descendente para calientes, ascendente para fríos)
      const sortedByFrequencyHot = [...filteredForHot].sort((a, b) => b[1] - a[1])

      // Obtener los 3 más frecuentes (calientes)
      setHotNumbers(sortedByFrequencyHot.slice(0, 3))

      // Filtrar 0 y 00 para los números fríos
      const filteredForCold = frequencyArray.filter((item) => item[0] !== 0 && item[0] !== "00")

      // Ordenar por frecuencia para los fríos
      const sortedByFrequencyCold = [...filteredForCold].sort((a, b) => a[1] - b[1])

      // Obtener los 3 menos frecuentes (fríos) - solo consideramos números que han aparecido en los últimos 200 giros
      const nonZeroFrequency = sortedByFrequencyCold.filter((item) => item[1] > 0)
      if (nonZeroFrequency.length >= 3) {
        setColdNumbers(nonZeroFrequency.slice(0, 3))
      } else {
        // Si hay menos de 3 números con apariciones, completamos con los que no han aparecido (excepto 0 y 00)
        const zeroFrequency = filteredForCold.filter((item) => item[1] === 0)
        const coldOnes = nonZeroFrequency.slice(0, nonZeroFrequency.length)
        const zeroOnes = zeroFrequency.slice(0, 3 - coldOnes.length)
        setColdNumbers([...coldOnes, ...zeroOnes])
      }
    }

    // Calcular la mejor apuesta basada en los datos históricos del Croupier actual
    const calculateBestBet = () => {
      if (currentCroupierSpins.length < 5) {
        setBestBet({
          type: "Insuficientes datos",
          description: "Se necesitan más giros para hacer una recomendación",
          odds: "-",
          potential: 0,
          confidence: 0,
        })
        return
      }

      // Analizar los últimos 200 giros del Croupier actual (o todos si hay menos)
      const recentSpins = currentCroupierSpins.slice(0, Math.min(200, currentCroupierSpins.length))

      // Contar colores
      let redCount = 0
      let blackCount = 0
      let greenCount = 0

      // Contar paridad
      let evenCount = 0
      let oddCount = 0

      // Contar rangos
      let lowCount = 0 // 1-18
      let highCount = 0 // 19-36

      // Contar docenas
      let firstDozen = 0 // 1-12
      let secondDozen = 0 // 13-24
      let thirdDozen = 0 // 25-36

      // Contar columnas
      let firstColumn = 0 // 1,4,7,10,13,16,19,22,25,28,31,34
      let secondColumn = 0 // 2,5,8,11,14,17,20,23,26,29,32,35
      let thirdColumn = 0 // 3,6,9,12,15,18,21,24,27,30,33,36

      recentSpins.forEach((spin) => {
        const num = Number(spin.number)

        // Contar por color
        const color = getRouletteColor(spin.number)
        if (color === "red") redCount++
        else if (color === "black") blackCount++
        else greenCount++

        // Saltarse 0 y 00 para los demás conteos
        if (spin.number === 0 || spin.number === "00") return

        // Contar por paridad
        if (num % 2 === 0) evenCount++
        else oddCount++

        // Contar por rango
        if (num >= 1 && num <= 18) lowCount++
        else if (num >= 19 && num <= 36) highCount++

        // Contar por docena
        if (num >= 1 && num <= 12) firstDozen++
        else if (num >= 13 && num <= 24) secondDozen++
        else if (num >= 25 && num <= 36) thirdDozen++

        // Contar por columna
        if (num % 3 === 1) firstColumn++
        else if (num % 3 === 2) secondColumn++
        else if (num % 3 === 0) thirdColumn++
      })

      // Calcular las probabilidades y determinar la mejor apuesta
      const bets = [
        {
          type: "Color",
          subtype: redCount > blackCount ? "Rojo" : "Negro",
          count: Math.max(redCount, blackCount),
          total: redCount + blackCount,
          payout: 1, // 1 a 1
          confidence: (Math.max(redCount, blackCount) / (redCount + blackCount)) * 100,
        },
        {
          type: "Paridad",
          subtype: evenCount > oddCount ? "Par" : "Impar",
          count: Math.max(evenCount, oddCount),
          total: evenCount + oddCount,
          payout: 1, // 1 a 1
          confidence: (Math.max(evenCount, oddCount) / (evenCount + oddCount)) * 100,
        },
        {
          type: "Rango",
          subtype: lowCount > highCount ? "1-18" : "19-36",
          count: Math.max(lowCount, highCount),
          total: lowCount + highCount,
          payout: 1, // 1 a 1
          confidence: (Math.max(lowCount, highCount) / (lowCount + highCount)) * 100,
        },
        {
          type: "Docena",
          subtype:
            firstDozen > secondDozen && firstDozen > thirdDozen
              ? "Primera (1-12)"
              : secondDozen > firstDozen && secondDozen > thirdDozen
                ? "Segunda (13-24)"
                : "Tercera (25-36)",
          count: Math.max(firstDozen, secondDozen, thirdDozen),
          total: firstDozen + secondDozen + thirdDozen,
          payout: 2, // 2 a 1
          confidence: (Math.max(firstDozen, secondDozen, thirdDozen) / (firstDozen + secondDozen + thirdDozen)) * 100,
        },
        {
          type: "Columna",
          subtype:
            firstColumn > secondColumn && firstColumn > thirdColumn
              ? "Primera columna"
              : secondColumn > firstColumn && secondColumn > thirdColumn
                ? "Segunda columna"
                : "Tercera columna",
          count: Math.max(firstColumn, secondColumn, thirdColumn),
          total: firstColumn + secondColumn + thirdColumn,
          payout: 2, // 2 a 1
          confidence:
            (Math.max(firstColumn, secondColumn, thirdColumn) / (firstColumn + secondColumn + thirdColumn)) * 100,
        },
      ]

      // Ordenar por una combinación de confianza y pago potencial
      bets.sort((a, b) => {
        // Calcular un puntaje que combine confianza y pago
        const scoreA = a.confidence * (a.payout + 1)
        const scoreB = b.confidence * (b.payout + 1)
        return scoreB - scoreA
      })

      // Generar una estrategia de apuesta combinada
      const topBets = bets.slice(0, 3) // Tomar las 3 mejores apuestas

      // Distribuir 200 pesos entre las apuestas según su confianza relativa
      const totalConfidence = topBets.reduce((sum, bet) => sum + bet.confidence, 0)
      const betsWithAmount = topBets.map((bet) => {
        // Calcular el porcentaje de la apuesta total basado en la confianza relativa
        const percentage = bet.confidence / totalConfidence
        const amount = Math.round((200 * percentage) / 10) * 10 // Redondear a múltiplos de 10

        return {
          ...bet,
          amount,
          potentialWin: amount * bet.payout + amount,
        }
      })

      // Ajustar para asegurar que sumen exactamente 200
      const totalAllocated = betsWithAmount.reduce((sum, bet) => sum + bet.amount, 0)
      if (totalAllocated !== 200) {
        const diff = 200 - totalAllocated
        betsWithAmount[0].amount += diff
        betsWithAmount[0].potentialWin = betsWithAmount[0].amount * betsWithAmount[0].payout + betsWithAmount[0].amount
      }

      // Crear una descripción de la estrategia combinada
      const strategyDescription = betsWithAmount
        .map(
          (bet) =>
            `$${bet.amount} en ${bet.type}: ${bet.subtype} (${bet.confidence.toFixed(1)}%, potencial: $${bet.potentialWin})`,
        )
        .join("\n")

      // Calcular el potencial de ganancia total
      const totalPotential = betsWithAmount.reduce((sum, bet) => sum + bet.potentialWin, 0)

      // Calcular la confianza promedio ponderada
      const weightedConfidence = betsWithAmount.reduce((sum, bet) => sum + (bet.confidence * bet.amount) / 200, 0)

      setBestBet({
        type: "Estrategia Combinada",
        description: strategyDescription,
        odds: "Mixto",
        potential: totalPotential,
        confidence: weightedConfidence,
      })
    }

    calculateHotColdNumbers()
    calculateBestBet()
  }, [spins, currentCroupierId, croupiers])

  // Función para añadir un nuevo Croupier
  const handleAddCroupier = () => {
    if (croupierName.trim() === "") {
      alert("Por favor, ingrese un nombre para el Croupier")
      return
    }

    const newCroupier: Croupier = {
      id: "croupier-" + Date.now(),
      name: croupierName,
      startTime: Date.now(),
    }

    setCroupiers((prev) => [...prev, newCroupier])
    setCurrentCroupierId(newCroupier.id)
    setCroupierName("")
    setShowCroupierModal(false)
  }

  // Función para cambiar al Croupier seleccionado
  const handleChangeCroupier = (croupierId: string) => {
    setCurrentCroupierId(croupierId)
  }

  const handleAddSpin = () => {
    if (!currentCroupierId) {
      alert("No hay un Croupier seleccionado. Por favor, seleccione o añada un Croupier.")
      return
    }

    if (inputNumber === "00") {
      const newSpin: SpinRecord = {
        number: "00",
        timestamp: Date.now(),
        croupierId: currentCroupierId,
      }
      setSpins((prev) => [newSpin, ...prev])
      setInputNumber("")
      return
    }

    const num = Number.parseInt(inputNumber)
    if (!isNaN(num) && num >= 0 && num <= 36) {
      const newSpin: SpinRecord = {
        number: num,
        timestamp: Date.now(),
        croupierId: currentCroupierId,
      }
      setSpins((prev) => [newSpin, ...prev])
      setInputNumber("")
    }
  }

  const handleSelectNumber = (num: string | number) => {
    if (!currentCroupierId) {
      alert("No hay un Croupier seleccionado. Por favor, seleccione o añada un Croupier.")
      return
    }

    const newSpin: SpinRecord = {
      number: num,
      timestamp: Date.now(),
      croupierId: currentCroupierId,
    }
    setSpins((prev) => [newSpin, ...prev])
  }

  // Añadir función para manejar la tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddSpin()
    }
  }

  const handleClearHistory = () => {
    if (confirm("¿Está seguro que desea borrar todo el historial?")) {
      setSpins([])
      localStorage.removeItem("rouletteSpins")
    }
  }

  // Primero, añadir una nueva función para eliminar un giro específico después de la función handleClearHistory:

  const handleDeleteSpin = (timestamp: number) => {
    if (confirm("¿Está seguro que desea eliminar este resultado?")) {
      setSpins((prev) => prev.filter((spin) => spin.timestamp !== timestamp))
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  // Obtener el nombre del Croupier actual
  const getCurrentCroupierName = () => {
    const currentCroupier = croupiers.find((c) => c.id === currentCroupierId)
    return currentCroupier ? currentCroupier.name : "Sin Croupier"
  }

  // Filtrar los giros del Croupier actual para mostrar en el historial
  const currentCroupierSpins = spins.filter((spin) => spin.croupierId === currentCroupierId)

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border-b border-[#B8860B]/30 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <p className="text-2xl sm:text-3xl font-bold text-center text-[#D4AF37]">Panel de Control para Croupier</p>
          <div className="mt-2 sm:mt-0 flex items-center">
            <div className="mr-2 text-[#D4AF37]">
              Croupier Actual: <span className="font-bold">{getCurrentCroupierName()}</span>
            </div>
            <Button onClick={() => setShowCroupierModal(true)} className="bg-[#D4AF37] hover:bg-[#B8860B] text-black">
              Cambiar Croupier
            </Button>
          </div>
        </div>
      </header>

      {/* Modal para cambiar de Croupier */}
      {showCroupierModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#D4AF37] w-full max-w-md">
            <h2 className="text-xl font-bold text-[#D4AF37] mb-4">Gestión de Croupiers</h2>

            {/* Lista de Croupiers existentes */}
            <div className="mb-4">
              <h3 className="text-[#D4AF37] mb-2">Seleccionar Croupier Existente:</h3>
              <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                {croupiers.map((croupier) => (
                  <div
                    key={croupier.id}
                    className={`p-2 rounded cursor-pointer border ${
                      currentCroupierId === croupier.id
                        ? "bg-[#D4AF37]/20 border-[#D4AF37]"
                        : "border-[#B8860B]/30 hover:bg-[#2a2a2a]"
                    }`}
                    onClick={() => handleChangeCroupier(croupier.id)}
                  >
                    <div className="font-medium">{croupier.name}</div>
                    <div className="text-xs text-[#D4AF37]/60">{new Date(croupier.startTime).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulario para añadir nuevo Croupier */}
            <div className="mb-4">
              <h3 className="text-[#D4AF37] mb-2">Añadir Nuevo Croupier:</h3>
              <div className="flex space-x-2">
                <Input
                  value={croupierName}
                  onChange={(e) => setCroupierName(e.target.value)}
                  placeholder="Nombre del Croupier"
                  className="bg-[#2a2a2a] border-[#B8860B]/30 text-white"
                />
                <Button onClick={handleAddCroupier} className="bg-[#D4AF37] hover:bg-[#B8860B] text-black">
                  Añadir
                </Button>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setShowCroupierModal(false)}
                variant="outline"
                className="border-[#B8860B]/30 text-[#D4AF37]"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto p-2 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Columna izquierda - Tabla de pagos */}
          <div className="w-full lg:w-1/4">
            {/* Tabla de Pagos */}
            <Card className="bg-[#1a1a1a] border-[#B8860B]/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#D4AF37]">Tabla de Pagos</CardTitle>
                <CardDescription className="text-[#D4AF37]/70">Pagos estándar de ruleta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payoutTable.map((item, index) => (
                    <div key={index} className="bg-[#2a2a2a] p-3 rounded-md border border-[#B8860B]/20">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-[#D4AF37]">{item.bet}</div>
                          <div className="text-sm text-white/80">{item.example}</div>
                        </div>
                        <div className="text-xl font-bold text-[#D4AF37]">{item.payout}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna central - Números calientes/fríos e historial */}
          <div className="w-full lg:w-1/2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Números Calientes */}
              <Card className="bg-[#1a1a1a] border-[#B8860B]/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#D4AF37]">Números Calientes</CardTitle>
                  <CardDescription className="text-[#D4AF37]/70">
                    Los más frecuentes (últimos 200 giros de {getCurrentCroupierName()})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-around">
                    {hotNumbers.map(([num, count], index) => (
                      <div key={index} className="text-center">
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${getColorClass(num)} flex items-center justify-center ${getTextColorClass(num)} text-xl sm:text-2xl font-bold mb-2 border border-[#D4AF37]`}
                        >
                          {num}
                        </div>
                        <div className="text-sm text-[#D4AF37]">{count} veces</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Números Fríos */}
              <Card className="bg-[#1a1a1a] border-[#B8860B]/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#D4AF37]">Números Fríos</CardTitle>
                  <CardDescription className="text-[#D4AF37]/70">
                    Los menos frecuentes (últimos 200 giros de {getCurrentCroupierName()})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-around">
                    {coldNumbers.map(([num, count], index) => (
                      <div key={index} className="text-center">
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${getColorClass(num)} border-2 border-[#D4AF37] flex items-center justify-center ${getTextColorClass(num)} text-xl sm:text-2xl font-bold mb-2`}
                        >
                          {num}
                        </div>
                        <div className="text-sm text-[#D4AF37]">{count} veces</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historial de Giros */}
            <Card className="bg-[#1a1a1a] border-[#B8860B]/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-[#D4AF37]">Historial de Giros - {getCurrentCroupierName()}</CardTitle>
                  <CardDescription className="text-[#D4AF37]/70">
                    Página {currentPage} de {Math.max(1, Math.ceil(currentCroupierSpins.length / itemsPerPage))}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  className="border-[#B8860B]/30 text-[#D4AF37] hover:bg-red-900/20 hover:text-red-400"
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Limpiar
                </Button>
              </CardHeader>
              <CardContent>
                {currentCroupierSpins.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto pr-2">
                      {currentCroupierSpins
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((spin, index) => (
                          <div
                            key={index}
                            className={`${getColorClass(spin.number)} p-2 rounded-md border border-[#B8860B]/20 text-center relative group`}
                          >
                            <div className={`text-xl font-bold ${getTextColorClass(spin.number)}`}>{spin.number}</div>
                            <div className="text-xs text-[#D4AF37]/60">{formatTime(spin.timestamp)}</div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSpin(spin.timestamp)
                              }}
                              className="absolute top-0 right-0 bg-red-800/80 text-white rounded-bl-md rounded-tr-md p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar resultado"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                    {currentCroupierSpins.length > itemsPerPage && (
                      <div className="flex justify-between items-center mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="border-[#B8860B]/30 text-[#D4AF37]"
                        >
                          Anterior
                        </Button>
                        <div className="text-[#D4AF37]">
                          Página {currentPage} de {Math.ceil(currentCroupierSpins.length / itemsPerPage)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(Math.ceil(currentCroupierSpins.length / itemsPerPage), prev + 1),
                            )
                          }
                          disabled={currentPage === Math.ceil(currentCroupierSpins.length / itemsPerPage)}
                          className="border-[#B8860B]/30 text-[#D4AF37]"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 text-[#D4AF37]/60">
                    No hay historial de giros para este Croupier. Comience a registrar números.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Registrar Número y Estadísticas (horizontalmente) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formulario de Entrada */}
              <Card className="bg-[#1a1a1a] border-[#B8860B]/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#D4AF37]">Registrar Número</CardTitle>
                  <CardDescription className="text-[#D4AF37]/70">
                    Añadir resultado para {getCurrentCroupierName()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <Label htmlFor="number-input" className="text-[#D4AF37]">
                          Número
                        </Label>
                        <Input
                          id="number-input"
                          type="text"
                          value={inputNumber}
                          onChange={(e) => setInputNumber(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="bg-[#2a2a2a] border-[#B8860B]/30 text-white"
                          placeholder="0-36 o 00"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleAddSpin} className="bg-[#D4AF37] hover:bg-[#B8860B] text-black">
                          <Plus className="mr-1 h-4 w-4" /> Añadir
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[#D4AF37] mb-2 block">Selección Rápida</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full border-[#B8860B]/30 text-[#D4AF37]">
                            Seleccionar Número <ChevronDown className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#2a2a2a] border-[#B8860B]/30 w-56 max-h-[300px] overflow-y-auto">
                          <div className="grid grid-cols-6 gap-1 p-1">
                            {rouletteNumbers.map((num) => (
                              <DropdownMenuItem
                                key={num}
                                onClick={() => handleSelectNumber(num)}
                                className="justify-center hover:bg-[#D4AF37] hover:text-black cursor-pointer"
                              >
                                {num}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estadísticas */}
              <Card className="bg-[#1a1a1a] border-[#B8860B]/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[#D4AF37]">Estadísticas de {getCurrentCroupierName()}</CardTitle>
                  <CardDescription className="text-[#D4AF37]/70">Resumen de datos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="bg-[#2a2a2a] p-4 rounded-md border border-[#B8860B]/20">
                      <div className="text-sm text-[#D4AF37]/70">Total de Giros</div>
                      <div className="text-3xl font-bold text-[#D4AF37]">{currentCroupierSpins.length}</div>
                    </div>
                    <div className="bg-[#2a2a2a] p-4 rounded-md border border-[#B8860B]/20">
                      <div className="text-sm text-[#D4AF37]/70">Último Número</div>
                      <div className="text-3xl font-bold text-[#D4AF37]">
                        {currentCroupierSpins.length > 0 ? currentCroupierSpins[0].number : "-"}
                      </div>
                    </div>
                    <div className="bg-[#2a2a2a] p-4 rounded-md border border-[#B8860B]/20">
                      <div className="text-sm text-[#D4AF37]/70">Números Únicos</div>
                      <div className="text-3xl font-bold text-[#D4AF37]">
                        {new Set(currentCroupierSpins.map((s) => s.number)).size}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recomendación de Apuesta */}
            <Card className="bg-[#1a1a1a] border-[#B8860B]/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-[#D4AF37]">
                  <Coins className="mr-2 h-5 w-5" /> Recomendación de Apuesta para {getCurrentCroupierName()} (200
                  pesos)
                </CardTitle>
                <CardDescription className="text-[#D4AF37]/70">
                  Basada en análisis de los últimos 200 giros de este Croupier
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-[#2a2a2a] p-4 rounded-md border border-[#B8860B]/20">
                    <div className="text-sm text-[#D4AF37]/70">Estrategia Recomendada</div>
                    <div className="text-xl font-bold text-[#D4AF37]">{bestBet.type}</div>
                    <div className="text-sm text-white/80 mt-2 whitespace-pre-line">{bestBet.description}</div>
                  </div>
                  <div className="bg-[#2a2a2a] p-4 rounded-md border border-[#B8860B]/20">
                    <div className="text-sm text-[#D4AF37]/70">Ganancia Potencial Total</div>
                    <div className="text-xl font-bold text-[#D4AF37]">
                      {bestBet.potential > 0 ? `$${bestBet.potential}` : "-"}
                    </div>
                    <div className="text-sm text-white/80 mt-1">Confianza: {bestBet.confidence.toFixed(1)}%</div>
                  </div>
                </div>
                <div className="mt-4 bg-[#2a2a2a] p-3 rounded-md border border-[#B8860B]/20">
                  <div className="flex items-center">
                    <TrendingUp className="h-5 w-5 text-[#D4AF37] mr-2" />
                    <span className="text-white/90">
                      Esta recomendación busca el mejor balance entre seguridad y ganancia potencial basado en los
                      patrones recientes de {getCurrentCroupierName()}.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha - Tabla de ruleta */}
          <div className="w-full lg:w-1/4 sticky top-0 lg:h-screen lg:overflow-y-auto pb-4">
            <Card className="bg-[#1a1a1a] border-[#B8860B]/50 h-full">
              <CardHeader className="pb-2 sticky top-0 bg-[#1a1a1a] z-10">
                <CardTitle className="text-[#D4AF37]">Tabla de Ruleta</CardTitle>
                <CardDescription className="text-[#D4AF37]/70">Seleccione un número para registrarlo</CardDescription>
              </CardHeader>

              <CardContent className="p-2">
                <div className="roulette-table bg-[#0c4d22] rounded-lg border-2 border-[#D4AF37]/70">
                  {/* Diseño de tapete real de ruleta */}
                  <div className="flex flex-col">
                    {/* Fila de 0 y 00 */}
                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(0)}
                        className={`w-12 h-12 bg-green-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 0
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        0
                      </div>
                      <div
                        onClick={() => handleSelectNumber("00")}
                        className={`w-12 h-12 bg-green-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === "00"
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        00
                      </div>
                    </div>

                    {/* Filas de números - Diseño real de ruleta */}
                    <div className="flex">
                      {/* Primera columna (1-34) */}
                      <div
                        onClick={() => handleSelectNumber(1)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 1
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        1
                      </div>
                      {/* Segunda columna (2-35) */}
                      <div
                        onClick={() => handleSelectNumber(2)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 2
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        2
                      </div>
                      {/* Tercera columna (3-36) */}
                      <div
                        onClick={() => handleSelectNumber(3)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 3
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        3
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(4)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 4
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        4
                      </div>
                      <div
                        onClick={() => handleSelectNumber(5)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 5
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        5
                      </div>
                      <div
                        onClick={() => handleSelectNumber(6)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 6
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        6
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(7)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 7
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        7
                      </div>
                      <div
                        onClick={() => handleSelectNumber(8)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 8
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        8
                      </div>
                      <div
                        onClick={() => handleSelectNumber(9)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 9
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        9
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(10)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 10
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        10
                      </div>
                      <div
                        onClick={() => handleSelectNumber(11)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 11
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        11
                      </div>
                      <div
                        onClick={() => handleSelectNumber(12)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 12
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        12
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(13)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 13
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        13
                      </div>
                      <div
                        onClick={() => handleSelectNumber(14)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 14
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        14
                      </div>
                      <div
                        onClick={() => handleSelectNumber(15)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 15
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        15
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(16)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 16
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        16
                      </div>
                      <div
                        onClick={() => handleSelectNumber(17)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 17
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        17
                      </div>
                      <div
                        onClick={() => handleSelectNumber(18)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 18
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        18
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(19)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 19
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        19
                      </div>
                      <div
                        onClick={() => handleSelectNumber(20)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 20
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        20
                      </div>
                      <div
                        onClick={() => handleSelectNumber(21)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 21
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        21
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(22)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 22
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        22
                      </div>
                      <div
                        onClick={() => handleSelectNumber(23)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 23
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        23
                      </div>
                      <div
                        onClick={() => handleSelectNumber(24)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 24
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        24
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(25)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 25
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        25
                      </div>
                      <div
                        onClick={() => handleSelectNumber(26)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 26
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        26
                      </div>
                      <div
                        onClick={() => handleSelectNumber(27)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 27
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        27
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(28)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 28
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        28
                      </div>
                      <div
                        onClick={() => handleSelectNumber(29)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 29
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        29
                      </div>
                      <div
                        onClick={() => handleSelectNumber(30)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 30
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        30
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(31)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 31
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        31
                      </div>
                      <div
                        onClick={() => handleSelectNumber(32)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 32
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        32
                      </div>
                      <div
                        onClick={() => handleSelectNumber(33)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 33
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        33
                      </div>
                    </div>

                    <div className="flex">
                      <div
                        onClick={() => handleSelectNumber(34)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 34
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        34
                      </div>
                      <div
                        onClick={() => handleSelectNumber(35)}
                        className={`w-12 h-12 bg-black text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 35
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        35
                      </div>
                      <div
                        onClick={() => handleSelectNumber(36)}
                        className={`w-12 h-12 bg-red-700 text-white flex items-center justify-center font-bold cursor-pointer border border-white/20 hover:opacity-80 ${
                          currentCroupierSpins.length > 0 && currentCroupierSpins[0].number === 36
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                      >
                        36
                      </div>
                    </div>
                  </div>

                  {/* Sección para Par/Impar, Rangos, Docenas y Columnas con porcentajes */}
                  <div className="mt-4 p-2 border-t border-[#D4AF37]/50">
                    <h3 className="font-bold text-[#D4AF37] mb-2 text-center">
                      Probabilidades ({currentCroupierSpins.length} giros)
                    </h3>

                    {/* Calculamos las probabilidades */}
                    {(() => {
                      // Inicializar contadores
                      let redCount = 0,
                        blackCount = 0,
                        greenCount = 0
                      let evenCount = 0,
                        oddCount = 0
                      let lowCount = 0,
                        highCount = 0
                      let firstDozen = 0,
                        secondDozen = 0,
                        thirdDozen = 0
                      let firstColumn = 0,
                        secondColumn = 0,
                        thirdColumn = 0

                      // Contar apariciones en los giros del Croupier actual
                      currentCroupierSpins.forEach((spin) => {
                        const num = Number(spin.number)

                        // Contar por color
                        const color = getRouletteColor(spin.number)
                        if (color === "red") redCount++
                        else if (color === "black") blackCount++
                        else greenCount++

                        // Saltarse 0 y 00 para los demás conteos
                        if (spin.number === 0 || spin.number === "00") return

                        // Contar por paridad
                        if (num % 2 === 0) evenCount++
                        else oddCount++

                        // Contar por rango
                        if (num >= 1 && num <= 18) lowCount++
                        else if (num >= 19 && num <= 36) highCount++

                        // Contar por docena
                        if (num >= 1 && num <= 12) firstDozen++
                        else if (num >= 13 && num <= 24) secondDozen++
                        else if (num >= 25 && num <= 36) thirdDozen++

                        // Contar por columna
                        if (num % 3 === 1) firstColumn++
                        else if (num % 3 === 2) secondColumn++
                        else if (num % 3 === 0) thirdColumn++
                      })

                      // Total de giros sin verdes para cálculos apropiados
                      const totalNoGreen = currentCroupierSpins.length - greenCount
                      const total = currentCroupierSpins.length

                      return (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {/* Colores */}
                          <div className="bg-[#2a2a2a] p-2 rounded-md border border-[#B8860B]/20">
                            <h4 className="font-bold text-[#D4AF37] mb-1">Colores</h4>
                            <div className="flex justify-between">
                              <span className="text-red-500">Rojo</span>
                              <span>{calculatePercentage(redCount, total)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white">Negro</span>
                              <span>{calculatePercentage(blackCount, total)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-green-500">Verde (0/00)</span>
                              <span>{calculatePercentage(greenCount, total)}</span>
                            </div>
                          </div>

                          {/* Par/Impar */}
                          <div className="bg-[#2a2a2a] p-2 rounded-md border border-[#B8860B]/20">
                            <h4 className="font-bold text-[#D4AF37] mb-1">Par/Impar (Even/Odd)</h4>
                            <div className="flex justify-between">
                              <span>Par / Even</span>
                              <span>{calculatePercentage(evenCount, totalNoGreen)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Impar / Odd</span>
                              <span>{calculatePercentage(oddCount, totalNoGreen)}</span>
                            </div>
                          </div>

                          {/* Rangos */}
                          <div className="bg-[#2a2a2a] p-2 rounded-md border border-[#B8860B]/20">
                            <h4 className="font-bold text-[#D4AF37] mb-1">Rangos</h4>
                            <div className="flex justify-between">
                              <span>1-18</span>
                              <span>{calculatePercentage(lowCount, totalNoGreen)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>19-36</span>
                              <span>{calculatePercentage(highCount, totalNoGreen)}</span>
                            </div>
                          </div>

                          {/* Docenas */}
                          <div className="bg-[#2a2a2a] p-2 rounded-md border border-[#B8860B]/20">
                            <h4 className="font-bold text-[#D4AF37] mb-1">Docenas</h4>
                            <div className="flex justify-between">
                              <span>1ª (1-12)</span>
                              <span>{calculatePercentage(firstDozen, totalNoGreen)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>2ª (13-24)</span>
                              <span>{calculatePercentage(secondDozen, totalNoGreen)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>3ª (25-36)</span>
                              <span>{calculatePercentage(thirdDozen, totalNoGreen)}</span>
                            </div>
                          </div>

                          {/* Columnas */}
                          <div className="bg-[#2a2a2a] p-2 rounded-md border border-[#B8860B]/20 col-span-2">
                            <h4 className="font-bold text-[#D4AF37] mb-1">Columnas</h4>
                            <div className="flex justify-between">
                              <span>1ª (1,4,7,...,34)</span>
                              <span>{calculatePercentage(firstColumn, totalNoGreen)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>2ª (2,5,8,...,35)</span>
                              <span>{calculatePercentage(secondColumn, totalNoGreen)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>3ª (3,6,9,...,36)</span>
                              <span>{calculatePercentage(thirdColumn, totalNoGreen)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="mt-6 border-t border-[#B8860B]/30 py-4">
        <div className="container mx-auto text-center text-[#D4AF37]/60 text-sm">
          Panel de Control para Croupier &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
