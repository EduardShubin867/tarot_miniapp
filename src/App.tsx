import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cards as tarotCards } from './cards'
import './App.css'
import ReactMarkdown from 'react-markdown'
import type { WebApp } from '@twa-dev/types'

// Добавляем определение типа для window.Telegram
declare global {
    interface Window {
        Telegram?: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            WebApp: any
        }
    }
}

// Тип для карты Таро
interface TarotCard {
    name: string
    meaning: string
    image: string
}

// Тип для расклада
interface TarotSpread {
    past: TarotCard
    present: TarotCard
    future: TarotCard
}

// Тип для ключей времени
type TimeKey = 'past' | 'present' | 'future'

const App: React.FC = () => {
    const [spread, setSpread] = useState<TarotSpread | null>(null)
    const [interpretation, setInterpretation] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [webApp, setWebApp] = useState<WebApp | null>(null)

    // Инициализация Telegram Web App
    useEffect(() => {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp
            tg.ready()
            tg.expand()
            setWebApp(tg)

            // Настройка темы
            document.body.style.backgroundColor =
                tg.themeParams.bg_color || '#ffffff'

            // Настройка MainButton
            tg.MainButton.setText('Сделать расклад')
                .show()
                .onClick(generateSpread)
        }
    }, [])

    // Генерация расклада
    const generateSpread = () => {
        setIsLoading(true)
        setInterpretation('')

        const shuffled = [...tarotCards].sort(() => 0.5 - Math.random())
        const newSpread: TarotSpread = {
            past: shuffled[0],
            present: shuffled[1],
            future: shuffled[2],
        }

        setSpread(newSpread)
        getInterpretation(newSpread)

        webApp?.HapticFeedback?.impactOccurred('medium')
    }

    // Запрос к OpenAI API
    const getInterpretation = async (spread: TarotSpread) => {
        try {
            const response = await fetch('/api/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini-2024-07-18',
                    messages: [
                        {
                            role: 'user',
                            content: `Ты - мистический оракул, древний провидец, говорящий загадочно и поэтично.
                            Интерпретируй расклад карт Таро, создавая атмосферу тайны и магии:

                            Прошлое: ${spread.past.name} (${spread.past.meaning})
                            Настоящее: ${spread.present.name} (${spread.present.meaning})
                            Будущее: ${spread.future.name} (${spread.future.meaning})

                            Дай мистическую интерпретацию в 200-300 слов. Используй метафоры, образные сравнения и поэтические обороты.
                            Начни с загадочного обращения. Заверши пророческим напутствием.

                            Используй форматирование markdown для выделения ключевых фраз и создания структуры текста.`,
                        },
                    ],
                    temperature: 0.9,
                }),
            })

            const data = await response.json()
            setInterpretation(data.choices[0].message.content)
        } catch (error) {
            console.error('Ошибка при получении интерпретации:', error)
            setInterpretation('Произошла ошибка при получении интерпретации')
        } finally {
            setIsLoading(false)
        }
    }

    // Анимации для карт
    const cardVariants = {
        initial: {
            opacity: 0,
            y: 100,
            rotateY: 180,
            scale: 0.8,
        },
        animate: {
            opacity: 1,
            y: 0,
            rotateY: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
                damping: 15,
                duration: 0.8,
            },
        },
        exit: {
            opacity: 0,
            y: -100,
            rotateY: -180,
            scale: 0.8,
            transition: {
                duration: 0.5,
            },
        },
    }

    useEffect(() => {
        const cards = document.querySelectorAll('.card')

        const handleMouseMove = (e: MouseEvent, card: Element) => {
            const rect = (card as HTMLElement).getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top

            ;(card as HTMLElement).style.setProperty('--mouse-x', `${x}px`)
            ;(card as HTMLElement).style.setProperty('--mouse-y', `${y}px`)

            const centerX = rect.width / 2
            const centerY = rect.height / 2
            const rotateX = -(y - centerY) / 20
            const rotateY = (x - centerX) / 20

            ;(
                card as HTMLElement
            ).style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`
        }

        const handleMouseLeave = (card: Element) => {
            ;(card as HTMLElement).style.transform =
                'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
        }

        cards.forEach((card) => {
            card.addEventListener('mousemove', (e) =>
                handleMouseMove(e as MouseEvent, card)
            )
            card.addEventListener('mouseleave', () => handleMouseLeave(card))
        })

        return () => {
            cards.forEach((card) => {
                card.removeEventListener('mousemove', (e) =>
                    handleMouseMove(e as MouseEvent, card)
                )
                card.removeEventListener('mouseleave', () =>
                    handleMouseLeave(card)
                )
            })
        }
    }, [spread])

    return (
        <div className="app">
            <div className="mystical-bg" />
            <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                Расклад Таро
            </motion.h1>

            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="loading-container"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="crystal-ball">
                            <div className="crystal-ball__sphere">
                                <div className="crystal-ball__mist" />
                                <div className="crystal-ball__glow" />
                            </div>
                            <div className="crystal-ball__base" />
                        </div>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            Читаю судьбу...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateSpread}
                disabled={isLoading}
            >
                {isLoading ? 'Генерируется...' : 'Сделать расклад'}
            </motion.button>

            <AnimatePresence mode="wait">
                {spread && (
                    <motion.div
                        className="spread"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {(['past', 'present', 'future'] as const).map(
                            (time: TimeKey, index) => (
                                <motion.div
                                    key={`${time}-${spread[time].name}`}
                                    className="card"
                                    variants={cardVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                    transition={{ delay: index * 0.2 }}
                                >
                                    <h3>
                                        {time === 'past'
                                            ? 'Прошлое'
                                            : time === 'present'
                                            ? 'Настоящее'
                                            : 'Будущее'}
                                    </h3>
                                    <p>{spread[time].name}</p>
                                    <p>{spread[time].meaning}</p>
                                </motion.div>
                            )
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {interpretation && (
                    <motion.div
                        className="interpretation"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2>Интерпретация</h2>
                        <ReactMarkdown>{interpretation}</ReactMarkdown>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default App
