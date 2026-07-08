import QuizQuestion from '#models/quiz_question'
import QuizAttempt from '#models/quiz_attempt'
import { answerValidator } from '#validators/newspaper'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Handles the daily quiz. Answering a question records the attempt (so a running
 * score can be kept and recently-missed topics can steer future quizzes) and
 * reveals whether the answer was right, along with the explanation.
 */
export default class QuizController {
  /** Records the reader's answer and returns the correct option and explanation. */
  async answer({ params, request, serialize, response }: HttpContext) {
    const question = await QuizQuestion.find(params.id)
    if (!question) {
      return response.notFound({ error: `There is no quiz question with id ${params.id}.` })
    }

    const { selectedIndex } = await request.validateUsing(answerValidator)
    if (selectedIndex >= question.options.length) {
      return response.unprocessableEntity({
        error: `This question only has ${question.options.length} options.`,
      })
    }

    const isCorrect = selectedIndex === question.correctIndex
    await QuizAttempt.create({ quizQuestionId: question.id, selectedIndex, isCorrect })

    return serialize({
      isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    })
  }

  /** The reader's running quiz score across every answer they have given. */
  async score({ serialize }: HttpContext) {
    const [answeredRow] = await QuizAttempt.query().count('* as total')
    const [correctRow] = await QuizAttempt.query().where('is_correct', true).count('* as total')

    const answered = Number(answeredRow.$extras.total)
    const correct = Number(correctRow.$extras.total)
    const accuracy = answered === 0 ? 0 : Math.round((correct / answered) * 100) / 100

    return serialize({ answered, correct, accuracy })
  }
}
