const {Op} = require('sequelize');
const {sequelize} = require("../model");

class BalanceController {
    constructor() {
    }

    /**
     * @api {post} /balances/deposit/:userId Deposits money into the the the balance of a client
     * @apiName deposit
     * @apiPermission logged-in
     * @apiDescription Deposits money into the the the balance of a client
     * @apiParam (Path) {Number} userId An user id (contractor or client)
     * @apiSuccess (Success 204) No content means deposit request was fine.
     * @apiError (Error 4XX) 400 Bad request if amount passed is NaN, profile balance lower than amount or the amount to deposit is more than 25% his total of jobs to pay
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    async deposit(req, res) {
        const {Job, Contract, Profile} = req.app.get('models')
        const {userId} = req.params
        const profile = req.profile.get({plain: true})
        const foreignKey = profile.type === 'client' ? 'Client' : 'Contractor';

        let transaction;

        try {
            const totalAmountOfJobToPay = await Job.sum('price', {
                where: {paid: {[Op.or]: [false, null]}},
                include: [
                    {
                        model: Contract,
                        where: {
                            [`${foreignKey}Id`]: profile.id
                        }
                    }
                ]
            })

            if (isNaN(+req.body.amount)) {
                return res.status(400).json({error: `Amount to deposit required (number)`})
            }

            if (profile.balance < +req.body.amount) {
                return res.status(400).json({error: `Your balance is too low to deposit this amount.`})
            }

            if (totalAmountOfJobToPay && (+req.body.amount > (0.25 * totalAmountOfJobToPay))) {
                return res.status(400).json({error: `Amount exceed 25% of your total job to pay.`})
            }

            transaction = await sequelize.transaction();

            await Profile.decrement({
                balance: +req.body.amount
            }, {where: {id: profile.id}});

            await Profile.increment({
                balance: +req.body.amount
            }, {where: {id: userId}});

            await transaction.commit();

            res.status(204).end()
        } catch (e) {
            if (transaction) {
                await transaction.rollback();
            }

            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }
    }
}

module.exports = BalanceController;
