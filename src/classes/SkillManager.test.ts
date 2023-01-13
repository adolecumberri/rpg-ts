import {BASIC_CHARACTER} from '../constants/testing/character';
import SkillManagerClass from './SkillManager';
import testingSkills from '../constants/testing/skills';

describe('Skill Manager works as expected', () => {
  const char = BASIC_CHARACTER;
  const SM = new SkillManagerClass(
      {
        character: char,
        skills: {},
      },
  );

  test('skill manager add skills as expected', () => {
    testingSkills.fireBall.setCharacter( char );
    SM.add(testingSkills.fireBall);
    expect(SM.skills[testingSkills.fireBall.name]).toBeTruthy();

    SM.add([testingSkills.blessing, testingSkills.iceBall]);
    expect(Object.keys(SM.skills).length).toBe(3);
  });


  test('kills manager removes skills as expected', () => {
    let deletedSkill = SM.remove(testingSkills.fireBall);
    expect(deletedSkill).toEqual(testingSkills.fireBall);
    expect(Object.keys(SM.skills).length).toBe(2);

    deletedSkill = SM.removeByName(testingSkills.blessing.name);
    expect(deletedSkill).toEqual(testingSkills.blessing);
    expect(Object.keys(SM.skills).length).toBe(1);
  });
});
