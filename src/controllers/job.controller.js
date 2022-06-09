const {Op} = require('sequelize');
const {sequelize} = require("../model");

class JobController {
    constructor() {
    }

    /**
     * @api {get} /jobs/unpaid Get all unpaid jobs for a user (***either*** a client or contractor), for ***active contracts only***
     * @apiName getJobsUnpaid
     * @apiPermission logged-in
     * @apiDescription Get all unpaid jobs for a user (***either*** a client or contractor), for ***active contracts only***
     * @apiSuccess (Success 200) {Object[]} result Contains database records about the best profession
     * @apiSuccess (Success 204) If no result in database
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 5XX) 500 Database error
     */
    async getJobsUnpaid(req, res) {
        const {Job, Contract} = req.app.get('models')
        const profile = req.profile.get({plain: true})
        const foreignKey = profile.type === 'client' ? 'Client' : 'Contractor';

        try {
            const jobs = await Job.findAll({
                where: {paid: {[Op.or]: [false, null]}},
                include: [
                    {
                        model: Contract,
                        where: {
                            [`${foreignKey}Id`]: profile.id,
                            status: {[Op.or]: ['new', 'in_progress']}
                        }
                    }
                ]
            })

            if (!jobs?.length) {
                return res.status(204).end()
            }

            res.json(jobs)
        } catch (e) {
            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }

    }

    /**
     * @api {post} /jobs/:job_id/pay Pay for a job
     * @apiName payJob
     * @apiPermission logged-in
     * @apiDescription Pay for a job
     * @apiParam (Path) {Number} job_id A job id
     * @apiSuccess (Success 200) {Object} result of the Job updated
     * @apiError (Error 4XX) 400 Bad request returned if profile balance is lower than the price
     * @apiError (Error 4XX) 401 Authentication failed
     * @apiError (Error 4XX) 404 Job not found
     * @apiError (Error 5XX) 500 Database error
     */
    async payJob(req, res) {
        const {Job, Contract, Profile} = req.app.get('models')
        const {job_id} = req.params
        const profile = req.profile.get({plain: true})
        const foreignKey = profile.type === 'client' ? 'Client' : 'Contractor';

        let transaction;

        try {
            const job = await Job.findOne({
                where: {id: job_id, paid: {[Op.or]: [false, null]}},
                include: [
                    {
                        model: Contract,
                        where: {
                            [`${foreignKey}Id`]: profile.id
                        }
                    }
                ]
            })

            if (!job) {
                return res.status(404).end()
            }

            if (profile.balance < job.price) {
                return res.status(400).end()
            }

            transaction = await sequelize.transaction();

            // First we update the profile balance
            await Profile.decrement({
                balance: job.price
            }, {where: {id: profile.id}, transaction});

            // Then we transfer the balance to the contractor
            await Profile.increment({
                balance: job.price
            }, {where: {id: job.Contract.ContractorId}, transaction});

            // Then we mark the job as paid with the paymentDate
            await Job.update({
                paid: true,
                paymentDate: new Date(),
            }, {where: {id: job.id}, transaction, returning: true, plain: true});

            // Finally we commit the transaction
            await transaction.commit();

            // Note for myself: Try to see why returning: true returning undefined in transaction.
            // because it's not opti to re-fetch again the DB.
            res.json(await Job.findOne({where: {id: job_id}}))
        } catch (e) {
            if (transaction) {
                await transaction.rollback();
            }
            // Oops, something went wrong here...
            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }
    }
}

module.exports = JobController;
