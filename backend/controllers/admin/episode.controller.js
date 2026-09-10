const Episode = require("../../models/episode.model");
const Series = require("../../models/series.model");
const { getMediaUrl, deleteMedia, deleteMediaFiles } = require("../../utils/mediaUrl");

// Helper to update totalSeasons and totalEpisodes in Series
const updateSeriesStats = async (seriesId) => {
  const seasons = await Episode.distinct("seasonNumber", { seriesId });
  const episodeCount = await Episode.countDocuments({ seriesId });
  await Series.findByIdAndUpdate(seriesId, {
    totalSeasons: seasons.length,
    totalEpisodes: episodeCount
  });
};




// ========================================
// ADD EPISODE
// ========================================
const addEpisode = async (req, res) => {
  try {
    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    const episodeData = {
      title: req.body.title,
      description: req.body.description,
      seriesId: req.body.seriesId,
      seasonNumber: Number(req.body.seasonNumber),
      episodeNumber: Number(req.body.episodeNumber),
      duration: req.body.duration,
      videoUrl: getMediaUrl(video, req.body.videoUrl || ""),
      thumbnail: getMediaUrl(thumbnail, req.body.thumbnailUrl || "")
    };

    const existingEpisode =
      await Episode.findOne({
        seriesId: episodeData.seriesId,
        seasonNumber: episodeData.seasonNumber,
        episodeNumber: episodeData.episodeNumber,
      });

    if (existingEpisode) {
      return res.status(409).json({
        success: false,
        message:
          "Episode already exists for this season",
      });
    }
    const episode = await Episode.create(episodeData);

    // Update totalSeasons
    await updateSeriesStats(req.body.seriesId);


    return res.status(201).json({ success: true, message: "Episode added successfully", episode });
  } catch (error) {

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Episode already exists"
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to add episode",
      error: error.message
    });
  }
};

const updateEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const video = req.files?.video?.[0];
    const thumbnail = req.files?.thumbnail?.[0];

    const episode = await Episode.findById(id);
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });

    const updateData = {};

    if (req.body.title !== undefined)
      updateData.title = req.body.title;

    if (req.body.description !== undefined)
      updateData.description = req.body.description;

    if (req.body.seasonNumber !== undefined)
      updateData.seasonNumber =
        Number(req.body.seasonNumber);

    if (req.body.episodeNumber !== undefined)
      updateData.episodeNumber =
        Number(req.body.episodeNumber);

    if (req.body.duration !== undefined)
      updateData.duration =
        req.body.duration;

    if (video) {
      await deleteMedia(episode.videoUrl);
      updateData.videoUrl = getMediaUrl(video);
    } else if (req.body.videoUrl) {
      updateData.videoUrl = req.body.videoUrl;
    }

    if (thumbnail) {
      await deleteMedia(episode.thumbnail);
      updateData.thumbnail = getMediaUrl(thumbnail);
    } else if (req.body.thumbnailUrl) {
      updateData.thumbnail = req.body.thumbnailUrl;
    }

    const updatedEpisode = await Episode.findByIdAndUpdate(id, updateData, { returnDocument: "after" });
    if (!updatedEpisode) return res.status(404).json({ success: false, message: "Episode not found" });

    // Update totalSeasons in case seasonNumber changed
    await updateSeriesStats(updatedEpisode.seriesId);

    return res.json({ success: true, message: "Episode updated successfully", episode: updatedEpisode });


  } catch (error) {

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Episode already exists"
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update episode"
    });
  }
};

const getEpisodes = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.query;
    const query = { seriesId };
    if (seasonNumber) query.seasonNumber = seasonNumber;

    const episodes = await Episode.find(query).sort({ seasonNumber: 1, episodeNumber: 1 }).lean();
    return res.json({ success: true, episodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch episodes" });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id);
    if (!episode) return res.status(404).json({ success: false, message: "Episode not found" });

    // Delete files from local /uploads storage.
    await deleteMediaFiles(
      episode.videoUrl,
      episode.thumbnail
    );

    await Episode.findByIdAndDelete(req.params.id);

    // Update totalSeasons
    await updateSeriesStats(episode.seriesId);

    return res.json({ success: true, message: "Episode deleted successfully" });


  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete episode" });
  }
};

const deleteSeason = async (req, res) => {
  try {
    const { seriesId, seasonNumber } = req.params;

    // Find all episodes in this season to delete their files
    const episodes = await Episode.find({ seriesId, seasonNumber });

    await Promise.all(
      episodes.map(async (ep) => {
        await deleteMediaFiles(ep.videoUrl, ep.thumbnail);
      })
    );

    await Episode.deleteMany({ seriesId, seasonNumber });

    // Update totalSeasons
    await updateSeriesStats(seriesId);

    return res.json({ success: true, message: `Season ${seasonNumber} episodes deleted successfully` });


  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to delete season episodes" });
  }
};

const searchEpisodes = async (req, res) => {
  try {
    const { q, seriesId } = req.query;
    const query = { title: { $regex: q, $options: "i" } };
    if (seriesId) query.seriesId = seriesId;

    const episodes = await Episode.find(query).sort({ seasonNumber: 1, episodeNumber: 1 });
    return res.json({ success: true, results: episodes });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};


module.exports = {
  addEpisode,
  getEpisodes,
  updateEpisode,
  deleteEpisode,
  deleteSeason,
  searchEpisodes,
};


