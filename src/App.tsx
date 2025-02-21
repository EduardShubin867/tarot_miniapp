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
        // Генерируем расклад сразу
        const shuffled = [...tarotCards].sort(() => 0.5 - Math.random())
        const newSpread: TarotSpread = {
            past: shuffled[0],
            present: shuffled[1],
            future: shuffled[2],
        }
        setSpread(newSpread)

        try {
            const response = await fetch(
                'https://mvtgbotapi.ru/api/tarot/interpretation',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: 'user',
                                content: `Ты - мистический оракул, древний провидец, говорящий загадочно и поэтично.
                                Интерпретируй расклад карт Таро, создавая атмосферу тайны и магии:

                                Прошлое: ${newSpread.past.name} (${newSpread.past.meaning})
                                Настоящее: ${newSpread.present.name} (${newSpread.present.meaning})
                                Будущее: ${newSpread.future.name} (${newSpread.future.meaning})

                                Структурируй ответ следующим образом:

                                1. Начни с загадочного обращения
                                2. Дай общее описание ситуации
                                3. Для каждой карты:
                                   - Подробно опиши значение в контексте позиции
                                   - Как она связана с другими картами
                                4. Заверши пророческим напутствием

                                Используй форматирование markdown:
                                - **жирным** выделяй названия карт
                                - *курсивом* - ключевые предсказания
                                - Используй ### для разделов

                                Общий объем: 300-400 слов.`,
                            },
                        ],
                    }),
                }
            )

            const data = await response.json()
            setInterpretation(data.choices[0].message.content)
        } catch (error) {
            console.error('Ошибка при получении интерпретации:', error)
            setInterpretation('Произошла ошибка при получении интерпретации')
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
                        src="images/deck.jpg"
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
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative',
                            width: '100%',
                            gap: '20px',
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
                                        backgroundImage: `url(${spread[time].image})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        transformStyle: 'preserve-3d',
                                        width: '260px',
                                        height: '500px',
                                        margin: '10px 0',
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
