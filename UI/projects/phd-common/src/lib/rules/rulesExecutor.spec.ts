import * as rules from './rulesExecutor';
import { Tree, PickType } from '../models/tree.model';
import { TreeVersionRules } from '../models/rule.model';

const defaultChoice = {
    attributeGroups: [], locationGroups: [], quantity: 0, selectedAttributes: []
};

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

    it('prompts if choice-to-choice rule results in deselection', () => {
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
                                            { ...defaultChoice, id: 1, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 2 },
                                            { ...defaultChoice, id: 3 }
                                        ]
                                    },
                                    {
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { ...defaultChoice, id: 4, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 5 },
                                            { ...defaultChoice, id: 6 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const tvRules: TreeVersionRules = {
            choiceRules: [
                {
                    choiceId: 4,
                    executed: false,
                    rules: [
                        { choices: [1], ruleId: 1, ruleType: 1 }
                    ]
                }
            ],
            pointRules: [],
			optionRules: [],
			lotChoiceRules: []
        };

        var depChoices = rules.getDependentChoices(tree, tvRules, [], <any>{ id: 2, quantity: 0 });
        expect(depChoices.length).toBe(1);
        expect(depChoices[0].id).toBe(4);
    });

    it('prompts if must not have choice-to-choice rule results in deselection', () => {
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
                                            { ...defaultChoice, id: 1, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 2 },
                                            { ...defaultChoice, id: 3 }
                                        ]
                                    },
                                    {
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { ...defaultChoice, id: 4, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 5 },
                                            { ...defaultChoice, id: 6 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const tvRules: TreeVersionRules = {
            choiceRules: [
                {
                    choiceId: 4,
                    executed: false,
                    rules: [
                        { choices: [2], ruleId: 1, ruleType: 2 }
                    ]
                }
            ],
            pointRules: [],
			optionRules: [],
			lotChoiceRules: []
        };

        var depChoices = rules.getDependentChoices(tree, tvRules, [], <any>{ id: 2, quantity: 0 });
        expect(depChoices.length).toBe(1);
        expect(depChoices[0].id).toBe(4);
    });

    it('prompts if point-to-point rule results in deselection', () => {
        const tree: Tree = <any>{
            treeVersion: {
                groups: [
                    {
                        subGroups: [
                            {
                                points: [
                                    {
                                        id: 1,
                                        pointPickTypeId: PickType.Pick0or1,
                                        choices: [
                                            { ...defaultChoice, id: 1, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 2 },
                                            { ...defaultChoice, id: 3 }
                                        ]
                                    },
                                    {
                                        id: 2,
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { ...defaultChoice, id: 4, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 5 },
                                            { ...defaultChoice, id: 6 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const tvRules: TreeVersionRules = {
            choiceRules: [],
            pointRules: [{
                pointId: 2, executed: false, rules: [
                    { ruleId: 1, ruleType: 1, choices: [], points: [1]}
                ]
            }],
			optionRules: [],
			lotChoiceRules: []
        };

        var depChoices = rules.getDependentChoices(tree, tvRules, [], <any>{ id: 1, quantity: 1 });
        expect(depChoices.length).toBe(1);
        expect(depChoices[0].id).toBe(4);
    });

    it('does not prompt if point-to-point rule is still satisfied', () => {
        const tree: Tree = <any>{
            treeVersion: {
                groups: [
                    {
                        subGroups: [
                            {
                                points: [
                                    {
                                        id: 1,
                                        pointPickTypeId: PickType.Pick0or1,
                                        choices: [
                                            { ...defaultChoice, id: 1, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 2 },
                                            { ...defaultChoice, id: 3 }
                                        ]
                                    },
                                    {
                                        id: 2,
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { ...defaultChoice, id: 4, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 5 },
                                            { ...defaultChoice, id: 6 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const tvRules: TreeVersionRules = {
            choiceRules: [],
            pointRules: [{
                pointId: 2, executed: false, rules: [
                    { ruleId: 1, ruleType: 1, choices: [], points: [1]}
                ]
            }],
			optionRules: [],
			lotChoiceRules: []
        };

        var depChoices = rules.getDependentChoices(tree, tvRules, [], <any>{ id: 2, quantity: 0 });
        expect(depChoices.length).toBe(0);
    });

    it('prompts if point-to-point rule results in recursive deselection', () => {
        const tree: Tree = <any>{
            treeVersion: {
                groups: [
                    {
                        subGroups: [
                            {
                                points: [
                                    {
                                        id: 1,
                                        pointPickTypeId: PickType.Pick0or1,
                                        choices: [
                                            { ...defaultChoice, id: 1, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 2 },
                                            { ...defaultChoice, id: 3 }
                                        ]
                                    },
                                    {
                                        id: 2,
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { ...defaultChoice, id: 4, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 5 },
                                            { ...defaultChoice, id: 6 }
                                        ]
                                    },
                                    {
                                        id: 3,
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { ...defaultChoice, id: 7, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 8 },
                                            { ...defaultChoice, id: 9 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const tvRules: TreeVersionRules = {
            choiceRules: [{
                choiceId: 4, executed: false, rules: [
                    { ruleId: 1, ruleType: 2, choices: [2] }
                ]
            }],
            pointRules: [{
                pointId: 3, executed: false, rules: [
                    { ruleId: 1, ruleType: 1, choices: [], points: [2]}
                ]
            }],
			optionRules: [],
			lotChoiceRules: []
        };

        var depChoices = rules.getDependentChoices(tree, tvRules, [], <any>{ id: 2, quantity: 0 });
        expect(depChoices.length).toBe(2);
        expect(depChoices[0].id).toBe(4);
        expect(depChoices[1].id).toBe(7);
    });

    it('does not prompt if deselected choice is not under contract', () => {
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
                                            { ...defaultChoice, id: 1, quantity: 1, lockedInChoice: {} },
                                            { ...defaultChoice, id: 2 },
                                            { ...defaultChoice, id: 3 }
                                        ]
                                    },
                                    {
                                        pointPickTypeId: PickType.Pick0ormore,
                                        choices: [
                                            { ...defaultChoice, id: 4, quantity: 1 },
                                            { ...defaultChoice, id: 5 },
                                            { ...defaultChoice, id: 6 }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        const tvRules: TreeVersionRules = {
            choiceRules: [
                {
                    choiceId: 4,
                    executed: false,
                    rules: [
                        { choices: [1], ruleId: 1, ruleType: 1 }
                    ]
                }
            ],
            pointRules: [],
			optionRules: [],
			lotChoiceRules: []
        };

        var depChoices = rules.getDependentChoices(tree, tvRules, [], <any>{ id: 2, quantity: 0 });
        expect(depChoices.length).toBe(0);
    });
});
