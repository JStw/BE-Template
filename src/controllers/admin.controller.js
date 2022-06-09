const {Op} = require('sequelize');
const {sequelize} = require("../model");

class AdminController {
    constructor() {
    }

    /**
     * @api {get} /admin/best-clients Returns the clients the paid the most for jobs in the query time period.
     * @apiName getBestClients
     * @apiPermission admin
     * @apiDescription Returns the clients the paid the most for jobs in the query time period.
     * @apiParam (Query) {String} start A minimum start time (format YYYY-MM-DD)
     * @apiParam (Query) {String} end A maximum end time (format YYYY-MM-DD)
     * @apiParam (Query) {Number} limit A limit
     * @apiSuccess (Success 200) {Object[]} result Contains database records about the best clients (Profiles)
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    async getBestClients(req, res) {
        const {Job, Contract, Profile} = req.app.get('models')
        const {start, end, limit} = req.query

        try {
            const bestClients = await Job.findAll({
                where: {
                    paid: true,
                    paymentDate: {
                        [Op.between]: [start, end]
                    }
                },
                attributes: [
                    [sequelize.col('Contract.ClientId'), 'id'],
                    [sequelize.literal("firstName || ' ' || lastName"), 'fullName'],
                    [sequelize.fn('sum', sequelize.col('price')), 'paid']
                ],
                include: [
                    {
                        attributes: [],
                        model: Contract,
                        as: 'Contract',
                        include: [
                            {
                                attributes: [],
                                model: Profile,
                                as: 'Client',
                                where: {
                                    type: 'client'
                                }
                            }
                        ]
                    }
                ],
                order: [[sequelize.literal('paid'), 'DESC']],
                group: [sequelize.literal('Contract.ClientId')],
                limit: !isNaN(+limit) && +limit || 2
            });

            res.json(bestClients)
        } catch (e) {
            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }
    }


    /**
     * @api {get} /admin/best-profession Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time
     * @apiName getBestProfession
     * @apiPermission admin
     * @apiDescription Returns the profession that earned the most money (sum of jobs paid) for any contactor that worked in the query time
     * @apiParam (Query) {String} start A minimum start time (format YYYY-MM-DD)
     * @apiParam (Query) {String} end A maximum end time (format YYYY-MM-DD)
     * @apiSuccess (Success 200) {Object} result Contains database records about the best profession
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    async getBestProfession(req, res) {
        const {Job, Contract, Profile} = req.app.get('models')
        const {start, end} = req.query

        try {
            const bestProfession = await Job.findOne({
                where: {
                    paid: true,
                    paymentDate: {
                        [Op.between]: [start, end]
                    }
                },
                attributes: [
                    [sequelize.col('Contract.Contractor.profession'), 'profession'],
                    [sequelize.fn('sum', sequelize.col('price')), 'total']
                ],
                include: [
                    {
                        attributes: [],
                        model: Contract,
                        as: 'Contract',
                        include: [
                            {
                                attributes: [],
                                model: Profile,
                                as: 'Contractor',
                                where: {
                                    type: 'contractor'
                                }
                            }
                        ]
                    }
                ],
                order: [[sequelize.literal('total'), 'DESC']],
                group: [sequelize.literal('profession')]
            });

            if (!bestProfession) {
                return res.status(204).end()
            }

            res.json(bestProfession)
        } catch (e) {
            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }
    }
}

module.exports = AdminController;
