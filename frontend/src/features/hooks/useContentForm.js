import { useState } from "react";

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "movie",
  language: "",
  releaseYear: "",
  duration: "",
  genre: "",
  category: [],
  rating: "",
  videoUrl: "",
  trailerUrl: "",
  poster: "",
  banner: "",
  isPremium: false,
  isPublished: true,
  isComingSoon: false,
  releaseDate: "",
  priority: 0,
  cast: [
    {
      name: "",
      image: "",
    },
  ],
  seasons: [],
};

export default function useContentForm() {
  const [form, setForm] = useState(EMPTY_FORM);

  const ch = (e) => {
    const { name, type, checked } = e.target;
    let value = e.target.value;

    if (name === "rating" && value !== "") {
      const num = Number(value);
      if (num > 10) {
        value = "10";
      } else if (num < 0) {
        value = "0";
      }
    }

    setForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const setType = (type) => {
    setForm((f) => ({
      ...f,
      type,
    }));
  };

  const addCast = () => {
    setForm((f) => ({
      ...f,
      cast: [
        ...f.cast,
        {
          name: "",
          image: "",
        },
      ],
    }));
  };

  const removeCast = (index) => {
    setForm((f) => ({
      ...f,
      cast: f.cast.filter((_, i) => i !== index),
    }));
  };

  const chCast = (index, field, value) => {
    setForm((f) => ({
      ...f,
      cast: f.cast.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
  };

  const addSeason = () => {
    setForm((f) => ({
      ...f,
      seasons: [
        ...f.seasons,
        {
          seasonNumber: f.seasons.length + 1,
          episodes: [],
        },
      ],
    }));
  };

  const removeSeason = (seasonIndex) => {
    setForm((f) => ({
      ...f,
      seasons: f.seasons.filter((_, i) => i !== seasonIndex),
    }));
  };

  const addEp = (seasonIndex) => {
    setForm((f) => ({
      ...f,
      seasons: f.seasons.map((s, i) =>
        i === seasonIndex
          ? {
              ...s,
              episodes: [
                ...s.episodes,
                {
                  title: "",
                  videoUrl: "",
                  thumbnailUrl: "",
                  duration: "",
                },
              ],
            }
          : s
      ),
    }));
  };

  const removeEp = (seasonIndex, episodeIndex) => {
    setForm((f) => ({
      ...f,
      seasons: f.seasons.map((s, i) =>
        i === seasonIndex
          ? {
              ...s,
              episodes: s.episodes.filter((_, j) => j !== episodeIndex),
            }
          : s
      ),
    }));
  };

  const chEp = (seasonIndex, episodeIndex, field, value) => {
    setForm((f) => ({
      ...f,
      seasons: f.seasons.map((s, i) =>
        i === seasonIndex
          ? {
              ...s,
              episodes: s.episodes.map((ep, j) =>
                j === episodeIndex ? { ...ep, [field]: value } : ep
              ),
            }
          : s
      ),
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
  };

  return {
    form,
    setForm,
    ch,
    setType,
    addCast,
    removeCast,
    chCast,
    addSeason,
    removeSeason,
    addEp,
    removeEp,
    chEp,
    resetForm,
  };
}