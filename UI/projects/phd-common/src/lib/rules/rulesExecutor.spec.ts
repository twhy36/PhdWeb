import * as rules from './rulesExecutor';
import { Tree, PickType } from '../models/tree.model';

describe('rulesExecutor', function () {
    it('handles choice deselection based on pick type', () => {
        const tree: Tree = <any>{
            treeVersion: {
                groups: [
                    {
                        subGroups: [
                            {
                                points: [
                                    {
                                        pointPickTypeId: PickType.Pick0or1,
                                        choices: [
                                            { id: 1, quantity: 1 },
                                            { id: 2, quantity: 1 },
                                            { id: 3, quantity: 1 }
                                        ]
                                    },
                                    {
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { id: 4, quantity: 1 },
                                            { id: 5, quantity: 1 },
                                            { id: 6, quantity: 1 }
                                        ]
                                    },
                                    {
                                        pointPickTypeId: PickType.Pick1,
                                        choices: [
                                            { id: 10, quantity: 1 },
                                            { id: 11, quantity: 1 },
                                            { id: 12, quantity: 1 }
                                        ]
                                    },
                                    {
                                        pointPickTypeId: PickType.Pick1ormore,
                                        choices: [
                                            { id: 13, quantity: 1 },
                                            { id: 14, quantity: 1 },
                                            { id: 15, quantity: 1 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        rules.selectChoice(tree, 1);
        expect(rules.findChoice(tree, c => c.id === 2).quantity).toBe(0);
        expect(rules.findChoice(tree, c => c.id === 3).quantity).toBe(0);

        rules.selectChoice(tree, 4);
        expect(rules.findChoice(tree, c => c.id === 5).quantity).toBe(1);
        expect(rules.findChoice(tree, c => c.id === 6).quantity).toBe(1);

        rules.selectChoice(tree, 10);
        expect(rules.findChoice(tree, c => c.id === 11).quantity).toBe(0);
        expect(rules.findChoice(tree, c => c.id === 12).quantity).toBe(0);

        rules.selectChoice(tree, 13);
        expect(rules.findChoice(tree, c => c.id === 14).quantity).toBe(1);
        expect(rules.findChoice(tree, c => c.id === 15).quantity).toBe(1);
    });
});
