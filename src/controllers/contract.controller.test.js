const ContractController = require('./contract.controller')
const {Op} = require('sequelize');
const {Profile} = require("../model");

describe('ContractController', () => {
    let controller;

    beforeEach(() => {
        controller = new ContractController();
    })

    test('it should init ContractController', () => {
        expect(controller).not.toBe(undefined)
    })

    describe('getContracts', () => {
        let profileMock, modelMock, findAllMock, jsonResMock, statusResMock, mockedRequest, mockedRes, statusJsonMock;

        const expectedOptionCall = {
            where: {status: {[Op.ne]: 'terminated'}},
            include: [
                {
                    model: Profile,
                    as: 'Client',
                    attributes: ['id'],
                    where: {
                        id: '1234'
                    }
                }
            ]
        };

        beforeEach(() => {
            profileMock = jest.fn();
            modelMock = jest.fn();
            findAllMock = jest.fn();
            jsonResMock = jest.fn();
            statusResMock = jest.fn();
            statusJsonMock = jest.fn();

            profileMock.mockReturnValue({type: 'client', id: '1234'});
            modelMock.mockReturnValue({Contract: {findAll: findAllMock}});
            statusResMock.mockReturnValue({end: () => null, json: statusJsonMock});

            mockedRequest = {params: {id: 'an_id'}, profile: {get: profileMock}, app: {get: modelMock}};
            mockedRes = {status: statusResMock, json: jsonResMock};
        })

        it('should find contracts and return them', async () => {
            findAllMock.mockReturnValue(['some', 'contracts'])

            await controller.getContracts(mockedRequest, mockedRes);

            expect(modelMock.mock.calls[0][0]).toBe('models')
            expect(findAllMock.mock.calls[0][0]).toStrictEqual(expectedOptionCall)
            expect(jsonResMock).toBeCalledWith(['some', 'contracts'])
            expect(statusResMock).not.toBeCalled();
        })

        it('should return 204 if no content', async () => {
            findAllMock.mockReturnValue([])

            await controller.getContracts(mockedRequest, mockedRes);

            expect(modelMock.mock.calls[0][0]).toBe('models')
            expect(findAllMock.mock.calls[0][0]).toStrictEqual(expectedOptionCall)
            expect(jsonResMock).not.toBeCalled();
            expect(statusResMock).toBeCalledWith(204);
        })

        it('should handle error if database call throw an error', async () => {
            findAllMock.mockImplementation(() => {
                throw new Error('call failed because I want it to fail btw!');
            });

            await controller.getContracts(mockedRequest, mockedRes);

            expect(modelMock.mock.calls[0][0]).toBe('models')
            expect(findAllMock.mock.calls[0][0]).toStrictEqual(expectedOptionCall)
            expect(jsonResMock).not.toBeCalled();
            expect(statusResMock).toBeCalledWith(500);
            expect(statusJsonMock).toBeCalledWith({
                error: `Something went wrong with database call, err: call failed because I want it to fail btw!`
            })
        })
    })

    /*
    try {

            if (!contracts?.length) {
                return res.status(204).end()
            }

            res.json(contracts)
        } catch (e) {
            return res.status(500).json({
                error: `Something went wrong with database call, err: ${e.message || 'unknown'}`
            })
        }
     */
})
