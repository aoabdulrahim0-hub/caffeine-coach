// types/common.mo — cross-cutting types shared across all domains
module {

  public type Timestamp = Int;
  public type MuscleGroup = Text;
  public type ExerciseId = Text;

  public type Result<T, E> = { #ok : T; #err : E };

  public type ExperienceLevel = { #beginner; #intermediate; #advanced };
  public type Gender = { #male; #female };
  public type Goal = { #strength; #hypertrophy; #quick };

};
