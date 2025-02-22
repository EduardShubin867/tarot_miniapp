import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    const [initialDeck, setInitialDeck] = useState<boolean>(true)

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

    // Добавляем эффект для управления состоянием кнопки
    useEffect(() => {
        if (webApp) {
            if (isLoading) {
                webApp.MainButton.disable()
                webApp.MainButton.setText('Читаю карты...')
            } else {
                webApp.MainButton.enable()
                webApp.MainButton.setText('Сделать расклад')
            }
        }
    }, [isLoading, webApp])

    // Модифицируем функцию generateSpread
    const generateSpread = () => {
        setIsLoading(true)
        setInterpretation('')
        setInitialDeck(false)
        getInterpretation()
        webApp?.HapticFeedback?.impactOccurred('medium')
    }

    // Запрос к OpenAI API
    const getInterpretation = async () => {
        try {
            // Получаем расклад и интерпретацию с сервера
            const response = await fetch(
                'https://mvtgbotapi.ru/api/tarot/spread',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                }
            )

            const data = await response.json()
            setSpread(data.spread)
            setInterpretation(data.interpretation)
        } catch (error) {
            console.error('Ошибка при получении расклада:', error)
            setInterpretation('Произошла ошибка при получении расклада')
        } finally {
            setIsLoading(false)
        }
    }

    // Обновляем варианты анимации для карт расклада
    const cardVariants = {
        initial: {
            opacity: 0,
            x: 0,
            y: 0,
            rotateY: 180,
            scale: 0.6,
        },
        animate: {
            opacity: 1,
            x: 0,
            y: 0,
            rotateY: 0,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 200,
                damping: 20,
                duration: 1,
            },
        },
        exit: {
            opacity: 0,
            y: -100,
            rotateY: 180,
            scale: 0.6,
            transition: {
                duration: 0.5,
            },
        },
    }

    // Добавляем функцию для обработки движения мыши/тапа
    const handleCardInteraction = (
        e: React.MouseEvent | React.TouchEvent,
        element: HTMLElement
    ) => {
        const rect = element.getBoundingClientRect()
        const x = e.type.includes('mouse')
            ? (e as React.MouseEvent).clientX - rect.left
            : (e as React.TouchEvent).touches[0].clientX - rect.left
        const y = e.type.includes('mouse')
            ? (e as React.MouseEvent).clientY - rect.top
            : (e as React.TouchEvent).touches[0].clientY - rect.top

        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = ((y - centerY) / centerY) * -15 // максимальный наклон 15 градусов
        const rotateY = ((x - centerX) / centerX) * 15

        element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`
    }

    // Добавляем функцию сброса позиции
    const handleCardReset = (element: HTMLElement) => {
        element.style.transform =
            'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
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

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateSpread}
                disabled={isLoading}
            >
                {isLoading ? 'Читаю карты...' : 'Сделать расклад'}
            </motion.button>

            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        className="loader-container"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="crystal-ball"></div>
                        <p className="mystical-text">
                            Древние силы раскрывают тайны судьбы...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {initialDeck && (
                <div className="initial-deck">
                    <img
                        src="images/deck.webp"
                        alt="Колода Таро"
                        style={{
                            width: '260px',
                            height: '500px',
                            margin: '20px auto',
                            display: 'block',
                            borderRadius: '15px',
                            boxShadow:
                                '0 2px 8px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
                        }}
                    />
                </div>
            )}

            <AnimatePresence mode="wait">
                {spread && !isLoading && !initialDeck && (
                    <motion.div
                        className="spread"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            width: '100%',
                            gap: '20px',
                            padding: '20px 0',
                        }}
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
                                    onMouseMove={(e) =>
                                        handleCardInteraction(
                                            e,
                                            e.currentTarget
                                        )
                                    }
                                    onTouchMove={(e) =>
                                        handleCardInteraction(
                                            e,
                                            e.currentTarget
                                        )
                                    }
                                    onMouseLeave={(e) =>
                                        handleCardReset(e.currentTarget)
                                    }
                                    onTouchEnd={(e) =>
                                        handleCardReset(e.currentTarget)
                                    }
                                    transition={{ delay: index * 0.3 }}
                                    style={{
                                        backgroundImage: `url(https://mvtgbotapi.ru/api/images/serve/cards/${spread[time].image})`, // Изменяем путь здесь
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center center',
                                        backgroundRepeat: 'no-repeat',
                                        transformStyle: 'preserve-3d',
                                        width: '260px',
                                        height: '500px',
                                        margin: '0 auto',
                                        display: 'block',
                                        position: 'relative',
                                        transition: 'transform 0.2s ease-out',
                                    }}
                                />
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
