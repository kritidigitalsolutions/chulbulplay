import { Plus, Users } from "lucide-react";
import CastMemberCard from "./CastMemberCard";

export default function CastSection({
  cast,
  castFiles,
  addCast,
  removeCast,
  chCast,
  handleCastFileChange,
  getFullUrl,
}) {
  return (
    <div className="premium-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h3
          className="section-title"
          style={{ marginBottom: 0 }}
        >
          <span>
            <Users size={18} />
          </span>

          Cast & Crew
        </h3>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={addCast}
          style={{
            borderRadius: "12px",
            padding: "8px 16px",
          }}
        >
          <Plus size={16} />
          Add Actor
        </button>
      </div>

      <div className="cast-grid">
        {cast.map((member, index) => (
          <CastMemberCard
            key={index}
            cast={member}
            index={index}
            castFile={castFiles[index]}
            removeCast={removeCast}
            chCast={chCast}
            handleCastFileChange={handleCastFileChange}
            getFullUrl={getFullUrl}
          />
        ))}
      </div>
    </div>
  );
}
